import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  viewChild,
  ElementRef,
  HostListener,
  NgZone,
  effect,
} from '@angular/core';
import { renderSVG } from 'uqr';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '@core/services/supabase.service';
import { SessionService } from '@core/services/session.service';
import { LoggerService } from '@core/services/logger.service';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { FeedbackService } from '@core/services/feedback.service';
import { TourService } from '@features/tour/tour.service';
import { GalleryPhoto, Photo } from '@core/models/photo';
import { DEFAULT_EVENT_KEY } from '@core/constants';
import { UploadQueueService } from '@core/services/upload-queue.service';
import { MemoriesComponent } from '@features/memories/memories';
import { EventService } from '@core/services/event.service';
import { AnalyticsService } from '@core/services/analytics.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MemoriesComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home-overlays.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly event = inject(EventService);
  readonly extrasOpen = signal(false);
  readonly invitationOpen = signal(false);
  readonly memoriesCinema = signal(false);
  private readonly readyForLaunch = signal(false);
  private previouslyOpen = false;
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly sessionService = inject(SessionService);
  private readonly logger = inject(LoggerService);
  readonly photoLimitService = inject(PhotoLimitService);
  readonly uploadQueue = inject(UploadQueueService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly tourService = inject(TourService);
  private readonly zone = inject(NgZone);
  private readonly analytics = inject(AnalyticsService);

  /** This device's ID — used for ownership checks */
  readonly myDeviceId = signal(this.sessionService.getDeviceId());

  /** ALL photos from ALL guests (newest first) */
  readonly globalPhotos = signal<GalleryPhoto[]>([]);
  // Keep fragment links on this route even though the document has <base href="/">.
  readonly albumAnchor = window.location.pathname + window.location.search + '#album';
  readonly visiblePhotos = computed(() =>
    this.activeTab() === 'personal' ? this.myPhotos() : this.globalPhotos(),
  );
  // Explicit lanes avoid CSS column balancing before image dimensions arrive.
  // Each image keeps its native ratio; no forced crops or equal-height rows.
  readonly photoColumns = computed(() => [
    this.visiblePhotos().filter((_, index) => index % 2 === 0),
    this.visiblePhotos().filter((_, index) => index % 2 === 1),
  ]);
  readonly loadError = signal(false);
  readonly unavailablePhotos = signal<ReadonlySet<number>>(new Set());
  readonly showMemories = signal(false);
  readonly shareMessage = signal('');
  readonly shareFallbackUrl = signal('');
  readonly shareQrOpen = signal(false);
  readonly shareQrDataUrl = signal('');
  readonly shareUrl = signal('');
  readonly shareCopied = signal(false);
  readonly canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  readonly promptIndex = signal(0);
  readonly photoPrompts = [
    'Una sonrisa que merezca quedarse.',
    'Junta a quienes llevan diez años en esta historia.',
    'Ese abrazo que no necesita palabras.',
    'Un detalle que los novios aún no hayan visto.',
    'La foto de vuestra mesa. Sin posar demasiado.',
    'Paula y Javier, desde tu mirada.',
  ];
  readonly currentPrompt = computed(() => this.photoPrompts[this.promptIndex()]);
  private destroyed = false;
  private firstPhotoTracked = false;

  /** Loading state */
  readonly isLoading = signal<boolean>(true);

  // Tab State (Signals)

  /** Active tab: 'global' or 'personal' */
  readonly activeTab = signal<'global' | 'personal'>('global');

  /** Personal gallery — derived from globalPhotos, zero extra queries */
  readonly myPhotos = computed(() =>
    this.globalPhotos().filter((photo) => photo.device_id === this.myDeviceId()),
  );

  // Real-Time

  /** Supabase Realtime channel reference for cleanup */
  private realtimeChannel: RealtimeChannel | null = null;

  // Gallery Upload

  /** Hidden file input reference (Signal-based viewChild) */
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly shareModal = viewChild<ElementRef<HTMLElement>>('shareModal');
  readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');
  private shareTrigger: HTMLElement | null = null;

  /** Whether a gallery upload is in progress */
  readonly isUploading = signal<boolean>(false);

  /** Whether the limit reached modal is visible */
  readonly showLimitModal = signal<boolean>(false);

  // Photo Viewer Overlay

  /** Currently selected photo for full-screen viewer */
  readonly selectedPhoto = signal<GalleryPhoto | null>(null);

  /** Index of selectedPhoto in globalPhotos() */
  readonly selectedPhotoIndex = signal<number>(0);

  /** Controls opacity fade when navigating between photos */
  readonly viewerPhotoVisible = signal<boolean>(true);

  private touchStartX = 0;
  private navTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Whether delete confirmation is showing */
  readonly isConfirmingDelete = signal<boolean>(false);

  /** Loading state during deletion */
  readonly isDeleting = signal<boolean>(false);

  /** Loading state during download */
  readonly isDownloading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const open = this.event.canUpload();
      if (!this.readyForLaunch() || open === this.previouslyOpen) return;
      this.previouslyOpen = open;
      if (open) {
        this.invitationOpen.set(false);
        void this.loadPhotos();
        if (!this.realtimeChannel) this.setupRealtimeSubscription();
        void this.uploadQueue.processPending();
      } else {
        this.globalPhotos.set([]);
        this.closeViewer();
        this.showMemories.set(false);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.uploadQueue.initialize();
    await this.event.initialize();
    this.previouslyOpen = this.event.canUpload();
    if (this.event.canUpload()) await this.loadPhotos();
    else this.isLoading.set(false);
    if (this.destroyed) return;
    this.analytics.track('home_view', this.analyticsContext());
    this.readyForLaunch.set(true);
    if (this.event.canUpload()) this.setupRealtimeSubscription();
    // The gallery stays usable while a slow connection drains the upload queue.
    void this.uploadQueue.processPending();
    // Demo mode (no ?e= param → event_key resolves to 'demo'): run the
    // one-time guided tour. maybeStart() no-ops if it already ran or is active,
    // so navigating back here mid-tour (step 5) won't restart it.
    this.tourService.maybeStart(this.sessionService.getStoredEventKey() === DEFAULT_EVENT_KEY);
  }

  /** User-triggered retry complements automatic online/focus processing. */
  async retryPendingUploads(): Promise<void> {
    this.analytics.track('recovery_action', { ...this.analyticsContext(), recovery: 'queue' });
    await this.uploadQueue.processPending();
    await this.loadPhotos();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.navTimeoutId) clearTimeout(this.navTimeoutId);
    if (this.realtimeChannel) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // Ownership Check

  // TODO(security): ownership is a client-side device_id check (UI gating only) — enforce with row-level security before trusting it.
  /** Returns true if the given photo belongs to this device. */
  isMyPhoto(photo: Photo): boolean {
    return photo?.device_id === this.myDeviceId();
  }

  // Data Loading

  /** Load ALL photos from Supabase (global gallery) */
  async loadPhotos(): Promise<void> {
    if (!this.event.canUpload()) return;
    this.isLoading.set(true);
    this.loadError.set(false);
    try {
      const photos = await this.supabaseService.fetchAllPhotos();
      // Map photos to include public URLs
      const photosWithUrls = photos.map((photo: Photo) => ({
        ...photo,
        publicUrl: this.supabaseService.getPhotoPublicUrl(photo.url),
      }));
      if (!this.destroyed && this.event.canUpload()) this.globalPhotos.set(photosWithUrls);
      if (!this.firstPhotoTracked && photosWithUrls.length) {
        this.firstPhotoTracked = true;
        this.analytics.track('gallery_first_photo_visible', this.analyticsContext(true));
      }
    } catch (error) {
      this.loadError.set(true);
      this.logger.error('Error loading photos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Real-Time Subscription

  /** Subscribe to INSERT and DELETE events on the photos table */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabaseService.subscribeToAllPhotos(
      // On INSERT — prepend the new photo
      (newPhoto: Photo) => {
        this.zone.run(() => {
          const photoWithUrl = {
            ...newPhoto,
            publicUrl: this.supabaseService.getPhotoPublicUrl(newPhoto.url),
          };
          if (!this.destroyed && this.event.canUpload())
            this.globalPhotos.update((photos) => [
              photoWithUrl,
              ...photos.filter((p) => p.id !== newPhoto.id),
            ]);
        });
      },
      // On DELETE — remove the deleted photo
      (oldPhoto: Pick<Photo, 'id'>) => {
        this.zone.run(() => {
          if (this.destroyed) return;
          this.globalPhotos.update((photos) => photos.filter((p) => p.id !== oldPhoto.id));
          if (this.selectedPhoto()?.id === oldPhoto.id) this.closeViewer();
        });
      },
    );
  }

  /** Intercepts camera/upload actions if limit is reached */
  handleActionClick(action: 'camera' | 'upload'): void {
    if (!this.event.canUpload()) return;
    if (this.photoLimitService.photosLeft() > 0) {
      this.analytics.track(action === 'camera' ? 'capture_tap' : 'upload_tap', {
        ...this.analyticsContext(),
        source: action === 'camera' ? 'camera' : 'gallery',
      });
      if (action === 'camera') {
        this.navigateToCamera();
      } else {
        this.triggerGalleryUpload();
      }
    } else {
      this.feedbackService.triggerWarning();
      this.showLimitModal.set(true);
    }
  }

  /** Returns the color class for the photo counter based on remaining photos */
  getCounterColorClass(): string {
    const remaining = this.photoLimitService.photosLeft();
    if (remaining > 3) return 'text-gray-500';
    if (remaining > 1) return 'text-orange-500';
    return 'text-red-500';
  }

  /** Switch to personal gallery and close modal so user can delete photos */
  goToPersonalGallery(): void {
    this.activeTab.set('personal');
    this.showLimitModal.set(false);
  }

  /** Close the limit reached modal */
  closeLimitModal(): void {
    this.showLimitModal.set(false);
  }

  /** Navigate to the camera screen */
  navigateToCamera(): void {
    this.router.navigate(['/camera']);
  }

  /** Switch the active tab */
  setTab(tab: 'global' | 'personal'): void {
    this.activeTab.set(tab);
    this.analytics.track('filter_change', { ...this.analyticsContext(), filter: tab });
    this.feedbackService.triggerButtonPress();
  }

  nextPrompt(): void {
    this.promptIndex.update((index) => (index + 1) % this.photoPrompts.length);
  }

  markPhotoUnavailable(id: number): void {
    this.unavailablePhotos.update((ids) => new Set([...ids, id]));
  }

  openMemories(cinema = false): void {
    if (this.globalPhotos().length) {
      this.memoriesCinema.set(cinema);
      this.extrasOpen.set(false);
      this.showMemories.set(true);
    }
  }

  async shareAlbum(event?: Event): Promise<void> {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('e', this.sessionService.getStoredEventKey());
    this.shareMessage.set('');
    this.shareFallbackUrl.set('');
    this.shareCopied.set(false);
    this.shareUrl.set(url.href);
    this.shareTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    try {
      const svg = renderSVG(url.href, {
        border: 3,
        blackColor: '#354b2e',
        whiteColor: '#fffdf7',
        ecc: 'M',
      });
      this.shareQrDataUrl.set(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    } catch (error) {
      this.logger.warn('Could not generate the album QR:', error);
      this.shareQrDataUrl.set('');
    }
    this.shareQrOpen.set(true);
    this.analytics.track('share_qr_open', this.analyticsContext());
    setTimeout(() =>
      this.shareModal()?.nativeElement.querySelector<HTMLElement>('button')?.focus(),
    );
  }

  closeShareQr(): void {
    this.shareQrOpen.set(false);
    this.shareCopied.set(false);
    setTimeout(() => {
      if (this.shareTrigger?.isConnected) this.shareTrigger.focus();
      else this.menuToggle()?.nativeElement.focus();
    });
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.shareCopied.set(true);
      this.analytics.track('share_qr_copy', this.analyticsContext());
    } catch {
      this.shareMessage.set('Copia este enlace para compartir el álbum:');
      this.shareFallbackUrl.set(this.shareUrl());
      this.closeShareQr();
    }
  }

  async openNativeShare(): Promise<void> {
    if (!navigator.share) {
      await this.copyShareLink();
      return;
    }
    try {
      await navigator.share({
        title: 'Paula y Javier · Nuestro álbum',
        text: 'Comparte tus fotos en el álbum de Paula y Javier.',
        url: this.shareUrl(),
      });
      this.analytics.track('share_native_open', this.analyticsContext());
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        await this.copyShareLink();
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleShareDialogKeydown(event: KeyboardEvent): void {
    if (!this.shareQrOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeShareQr();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = this.shareModal()?.nativeElement;
    const focusable = Array.from(
      modal?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled)') ??
        [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('window:online')
  async reconnectGallery(): Promise<void> {
    this.analytics.track('recovery_action', { ...this.analyticsContext(), recovery: 'gallery' });
    try {
      await this.sessionService.ensureAuthSession();
      if (!this.destroyed) await this.loadPhotos();
    } catch (error) {
      this.logger.warn('Gallery reconnection is pending:', error);
    }
  }

  async retryEvent(): Promise<void> {
    this.analytics.track('recovery_action', { ...this.analyticsContext(), recovery: 'event' });
    await this.event.refresh();
  }

  // Gallery Upload Logic

  /** Trigger the hidden file input */
  triggerGalleryUpload(): void {
    const input = this.fileInput();
    if (input) {
      input.nativeElement.click();
    }
  }

  /** Handle the file selected from gallery */
  async onGalleryFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    input.value = '';

    // Route to the CameraComponent passing the file in the state
    this.router.navigate(['/camera'], { state: { file } });
  }

  // Viewer Actions

  /** Open the full-screen photo viewer */
  openViewer(photo: GalleryPhoto): void {
    const index = this.visiblePhotos().findIndex((p) => p.id === photo.id);
    this.selectedPhotoIndex.set(index >= 0 ? index : 0);
    this.viewerPhotoVisible.set(true);
    this.selectedPhoto.set(photo);
    this.analytics.track('photo_open', this.analyticsContext());
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(false);
    this.isDownloading.set(false);
    this.feedbackService.triggerButtonPress();
  }

  private analyticsContext(hasPhotos = this.globalPhotos().length > 0) {
    return {
      viewportWidth: window.innerWidth,
      online: this.uploadQueue.isOnline(),
      hasPhotos,
    } as const;
  }

  /** Close the full-screen photo viewer */
  closeViewer(): void {
    if (this.navTimeoutId) {
      clearTimeout(this.navTimeoutId);
      this.navTimeoutId = null;
    }
    this.selectedPhoto.set(null);
    this.viewerPhotoVisible.set(true);
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(false);
    this.isDownloading.set(false);
  }

  /** Navigate to the next (1) or previous (-1) photo with an opacity fade */
  navigatePhoto(direction: 1 | -1): void {
    const photos = this.visiblePhotos();
    if (!photos.length) return;
    const currentIndex = photos.findIndex((p) => p.id === this.selectedPhoto()?.id);
    const newIndex = (Math.max(0, currentIndex) + direction + photos.length) % photos.length;
    this.feedbackService.triggerButtonPress();
    if (this.navTimeoutId) clearTimeout(this.navTimeoutId);
    this.viewerPhotoVisible.set(false);
    this.navTimeoutId = setTimeout(() => {
      this.navTimeoutId = null;
      if (!this.visiblePhotos().some((p) => p.id === photos[newIndex].id)) {
        this.viewerPhotoVisible.set(true);
        return;
      }
      this.selectedPhotoIndex.set(newIndex);
      this.selectedPhoto.set(photos[newIndex]);
      this.isConfirmingDelete.set(false);
      this.viewerPhotoVisible.set(true);
    }, 150);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.selectedPhoto()) return;
    if (event.key === 'Escape') this.closeViewer();
    if (event.key === 'ArrowLeft') this.navigatePhoto(-1);
    if (event.key === 'ArrowRight') this.navigatePhoto(1);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const deltaX = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(deltaX) > 50) {
      this.navigatePhoto(deltaX < 0 ? 1 : -1);
    }
  }

  /** Download the selected photo using blob fetch (mobile-safe) */
  async downloadPhoto(): Promise<void> {
    const photo = this.selectedPhoto();
    if (!photo) return;

    this.isDownloading.set(true);
    try {
      const filename = `lumen_foto_${photo.id}.jpg`;
      await this.supabaseService.downloadImageAsBlob(photo.publicUrl, filename);
    } catch (error) {
      this.logger.error('Error downloading photo:', error);
    } finally {
      this.isDownloading.set(false);
    }
  }

  /** Show the delete confirmation state */
  confirmDelete(): void {
    this.isConfirmingDelete.set(true);
  }

  /** Cancel the delete confirmation */
  cancelDelete(): void {
    this.isConfirmingDelete.set(false);
  }

  /** Execute the deletion after confirmation */
  async executeDelete(): Promise<void> {
    const photo = this.selectedPhoto();
    if (!photo) return;

    this.isDeleting.set(true);
    try {
      await this.supabaseService.deletePhoto(photo.id, photo.url);

      // Remove from local gallery state (realtime will also handle this)
      this.globalPhotos.update((current) => current.filter((p) => p.id !== photo.id));

      // Recover a photo slot
      this.photoLimitService.incrementCount();

      this.feedbackService.triggerSuccess();

      // Close the overlay
      this.closeViewer();
    } catch (error) {
      this.logger.error('Error deleting photo:', error);
      this.isDeleting.set(false);
      this.isConfirmingDelete.set(false);
    }
  }
}
