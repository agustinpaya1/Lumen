import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { DEFAULT_PHOTO_LIMIT } from '@core/constants';
import { SupabaseClientService } from './supabase-client.service';
import { SessionService } from './session.service';
import { LoggerService } from './logger.service';

export interface EventThemePlace {
  eyebrow?: string;
  title: string;
  address?: string;
  mapUrl?: string;
  linkLabel?: string;
}

export interface EventThemeColors {
  accent?: string;
  accentSoft?: string;
  accentContrast?: string;
  primary?: string;
  surface?: string;
  surfaceElevated?: string;
  surfaceMuted?: string;
  ink?: string;
  inkSecondary?: string;
  muted?: string;
  border?: string;
  focus?: string;
  success?: string;
  warning?: string;
  danger?: string;
  tvBg?: string;
  tvSurface?: string;
  tvText?: string;
  tvHighlight?: string;
}

export interface EventTheme {
  colors?: EventThemeColors;
  accentColor?: string;
  surfaceColor?: string;
  inkColor?: string;
  kicker?: string;
  headline?: string;
  invitationTitle?: string;
  eyebrow?: string;
  subtitle?: string;
  illustrationAlt?: string;
  photoPrompts?: string[];
  places?: EventThemePlace[];
}

const COLOR_TOKEN_MAP: Record<keyof EventThemeColors, string> = {
  accent: '--lumen-accent',
  accentSoft: '--lumen-accent-soft',
  accentContrast: '--lumen-accent-contrast',
  primary: '--lumen-primary',
  surface: '--lumen-surface',
  surfaceElevated: '--lumen-surface-elevated',
  surfaceMuted: '--lumen-surface-muted',
  ink: '--lumen-ink',
  inkSecondary: '--lumen-ink-secondary',
  muted: '--lumen-muted',
  border: '--lumen-line',
  focus: '--lumen-focus',
  success: '--lumen-success',
  warning: '--lumen-warning',
  danger: '--lumen-danger',
  tvBg: '--lumen-tv-bg',
  tvSurface: '--lumen-tv-surface',
  tvText: '--lumen-tv-text',
  tvHighlight: '--lumen-tv-highlight',
};

export interface EventState {
  event_key: string;
  name: string;
  event_date: string;
  uploads_open: boolean;
  opened_at: string | null;
  brand_color?: string | null;
  banner_url?: string | null;
  photo_limit?: number | null;
  theme?: EventTheme | null;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly backend = inject(SupabaseClientService).client;
  private readonly session = inject(SessionService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<EventState | null>(this.readCache());
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly canUpload = computed(() => this.state()?.uploads_open === true);
  readonly waiting = computed(() => this.state()?.uploads_open === false);
  readonly name = computed(() => this.state()?.name ?? 'Álbum del evento');
  readonly theme = computed<EventTheme>(() => this.state()?.theme ?? {});
  readonly accentColor = computed(
    () =>
      this.theme().colors?.accent ||
      this.theme().accentColor ||
      this.state()?.brand_color ||
      '#53653c',
  );
  readonly surfaceColor = computed(
    () => this.theme().colors?.surface || this.theme().surfaceColor || '#faf9f3',
  );
  readonly inkColor = computed(
    () => this.theme().colors?.ink || this.theme().inkColor || '#30372b',
  );
  readonly cssVariables = computed<Record<string, string | null>>(() => {
    const colors = this.theme().colors ?? {};
    const vars: Record<string, string | null> = {};
    for (const [key, cssVar] of Object.entries(COLOR_TOKEN_MAP) as [
      keyof EventThemeColors,
      string,
    ][]) {
      vars[cssVar] = colors[key] ?? null;
    }
    vars['--lumen-accent'] = this.accentColor();
    if (!vars['--lumen-surface'] && this.theme().surfaceColor) {
      vars['--lumen-surface'] = this.theme().surfaceColor!;
    }
    if (!vars['--lumen-ink'] && this.theme().inkColor) {
      vars['--lumen-ink'] = this.theme().inkColor!;
    }
    return vars;
  });
  readonly bannerUrl = computed(() => this.state()?.banner_url || null);
  readonly photoLimit = computed(() => {
    const limit = this.state()?.photo_limit;
    return typeof limit === 'number' && limit > 0 ? limit : DEFAULT_PHOTO_LIMIT;
  });
  readonly dateLabel = computed(() => {
    const date = this.state()?.event_date;
    return date ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)) : '';
  });
  private initialized = false;
  private refreshing: Promise<void> | null = null;
  private lastFailure: 'offline' | 'cached' | 'unavailable' | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.refreshing) await this.refreshing;
      return;
    }
    if (!this.initialized) {
      this.initialized = true;
      const channel = this.backend
        .channel('event:launch')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'events',
            filter: `event_key=eq.${this.session.getStoredEventKey()}`,
          },
          () => {
            void this.refresh();
          },
        )
        .subscribe();
      const onOnline = () => {
        this.logger.info('Connection restored; refreshing event state');
        void this.refresh();
      };
      const onVisibility = () => {
        if (document.visibilityState === 'visible') void this.refresh();
      };
      window.addEventListener('online', onOnline);
      document.addEventListener('visibilitychange', onVisibility);
      // Realtime is primary; this lightweight fallback covers socket loss.
      const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) void this.refresh();
      }, 30000);
      this.destroyRef.onDestroy(() => {
        clearInterval(timer);
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
        void this.backend.removeChannel(channel);
      });
    }
    await this.refresh();
  }

  refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.fetchState().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async fetchState(): Promise<void> {
    this.loading.set(true);
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { data, error } = await this.backend
        .rpc('get_event_state', { p_event_key: this.session.getStoredEventKey() })
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      if (
        !data ||
        data.event_key !== this.session.getStoredEventKey() ||
        typeof data.uploads_open !== 'boolean'
      ) {
        this.state.set(null);
        try {
          localStorage.removeItem(this.cacheKey);
        } catch {}
        throw new Error('Event not found');
      }
      const previous = this.state();
      if (!previous || previous.uploads_open !== data.uploads_open) {
        this.logger.info('Event upload state changed', { uploadsOpen: data.uploads_open });
      } else if (this.lastFailure) {
        this.logger.info('Event state refresh recovered');
      }
      this.lastFailure = null;
      this.state.set(data as EventState);
      this.error.set(false);
      try {
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
      } catch {
        /* Memory state still works. */
      }
    } catch (error) {
      this.error.set(true);
      const failure = !navigator.onLine ? 'offline' : this.state() ? 'cached' : 'unavailable';
      // The 30-second fallback must not produce repeated alerts for one outage.
      // A successful refresh re-arms reporting for a later independent failure.
      if (failure !== this.lastFailure) {
        if (failure === 'unavailable') {
          this.logger.critical('Event state unavailable without usable cache', error);
        } else {
          this.logger.warn('Event state refresh deferred', { reason: failure }, error);
        }
        this.lastFailure = failure;
      }
      // A previously observed open event still allows durable offline captures.
      // The database, not this cache, authorizes actual publication.
    } finally {
      this.loading.set(false);
    }
  }

  private get cacheKey(): string {
    return `lumen:event:${this.session.getStoredEventKey()}`;
  }
  private readCache(): EventState | null {
    try {
      const value = JSON.parse(localStorage.getItem(this.cacheKey) ?? 'null');
      return value?.event_key === this.session.getStoredEventKey() &&
        typeof value.uploads_open === 'boolean'
        ? value
        : null;
    } catch {
      return null;
    }
  }
}
