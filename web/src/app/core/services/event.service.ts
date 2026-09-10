import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { SessionService } from './session.service';

export interface EventState {
  event_key: string;
  name: string;
  event_date: string;
  uploads_open: boolean;
  opened_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly backend = inject(SupabaseClientService).client;
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<EventState | null>(this.readCache());
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly canUpload = computed(() => this.state()?.uploads_open === true);
  readonly waiting = computed(() => this.state()?.uploads_open === false);
  private initialized = false;
  private refreshing: Promise<void> | null = null;

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
      this.state.set(data as EventState);
      this.error.set(false);
      try {
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
      } catch {
        /* Memory state still works. */
      }
    } catch {
      this.error.set(true);
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
