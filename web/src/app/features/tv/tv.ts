import { Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { renderSVG } from 'uqr';
import { EventService } from '@core/services/event.service';
import { SessionService } from '@core/services/session.service';
import { SupabaseService } from '@core/services/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import { GalleryPhoto } from '@core/models/photo';
import { MemoriesComponent } from '@features/memories/memories';

@Component({
  selector: 'app-tv',
  imports: [MemoriesComponent],
  template: `
    <app-memories [photos]="photos()" [cinema]="true" [live]="true" [leaders]="event.isLeaders"
      [eventName]="event.name()" [eventDate]="event.dateLabel()"
      [joinUrl]="joinUrl" [qrDataUrl]="qrDataUrl" [liveStatus]="status()"
      (closed)="leave()" />
  `,
})
export class TvComponent implements OnInit, OnDestroy {
  readonly event = inject(EventService);
  private readonly session = inject(SessionService);
  private readonly backend = inject(SupabaseService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  readonly photos = signal<GalleryPhoto[]>([]);
  readonly offline = signal(!navigator.onLine);
  readonly loadError = signal(false);
  readonly loading = signal(true);
  readonly status = computed(() => {
    if (this.offline()) return 'Sin conexión · reconectando automáticamente';
    if (this.event.waiting()) return 'El álbum está cerrado · esperando la apertura';
    if (this.event.error() || this.loadError()) return 'Reconectando con el álbum…';
    if (this.loading()) return 'Conectando con el álbum…';
    return 'En directo · comparte tu foto';
  });
  readonly joinUrl = this.buildJoinUrl();
  readonly qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(this.joinUrl, {
    border: 4, blackColor: this.event.isLeaders ? '#163678' : '#000000', whiteColor: '#ffffff', ecc: 'M',
  }))}`;
  private channel: RealtimeChannel | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private pending = false;
  private fetching = false;
  private destroyed = false;
  private accessVersion = 0;

  constructor() {
    effect(() => {
      const open = this.event.canUpload();
      this.accessVersion++;
      if (!open) this.photos.set([]);
      else this.scheduleRefresh();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.event.initialize();
    if (this.destroyed) return;
    // Subscribe before the snapshot. SUBSCRIBED and queued refreshes cover races.
    this.channel = this.backend.subscribeToTvPhotos(() => this.scheduleRefresh());
    this.poll = setInterval(() => { void this.refresh(); }, 30000);
    await this.refresh();
  }

  private buildJoinUrl(): string {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('e', this.session.getStoredEventKey());
    return url.href;
  }

  private scheduleRefresh(): void {
    if (this.destroyed || this.debounce) return;
    this.debounce = setTimeout(() => {
      this.debounce = null;
      void this.refresh();
    }, 400);
  }

  async refresh(): Promise<void> {
    if (this.destroyed) return;
    this.offline.set(!navigator.onLine);
    if (this.offline() || !this.event.canUpload()) {
      this.loading.set(false);
      return;
    }
    if (this.fetching) { this.pending = true; return; }
    this.fetching = true;
    const version = this.accessVersion;
    try {
      if (!this.session.membershipReady) await this.session.ensureAuthSession();
      if (!this.session.membershipReady) throw new Error('Event membership unavailable');
      const rows = await this.backend.fetchTvPhotos();
      if (this.destroyed || version !== this.accessVersion || !this.event.canUpload()) return;
      const eventKey = this.session.getStoredEventKey();
      this.photos.set(rows.filter((p) => p.event_key === eventKey).map((p) => ({
        ...p, publicUrl: this.backend.getPhotoPublicUrl(p.url),
      })));
      this.loadError.set(false);
    } catch (error) {
      if (!this.destroyed) {
        if (!this.loadError()) this.logger.warn('TV refresh deferred; keeping the current playlist', error);
        this.loadError.set(true);
      }
    } finally {
      this.fetching = false;
      this.loading.set(false);
      if (this.pending && !this.destroyed) {
        this.pending = false;
        this.scheduleRefresh();
      }
    }
  }

  @HostListener('window:online')
  async reconnect(): Promise<void> {
    this.offline.set(false);
    await this.event.refresh();
    await this.refresh();
  }

  @HostListener('window:offline')
  disconnected(): void { this.offline.set(true); }

  @HostListener('document:visibilitychange')
  visible(): void {
    if (document.visibilityState === 'visible') void this.reconnect();
  }

  leave(): void {
    void this.router.navigate(['/home'], { queryParams: { e: this.session.getStoredEventKey() } });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.poll) clearInterval(this.poll);
    if (this.debounce) clearTimeout(this.debounce);
    if (this.channel) void this.backend.client.removeChannel(this.channel);
  }
}
