import { Component, signal, computed, inject, OnInit, OnDestroy, viewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '@core/services/supabase.service';
import { SessionService } from '@core/services/session.service';
import { LoggerService } from '@core/services/logger.service';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { FeedbackService } from '@core/services/feedback.service';
import { TourService } from '@core/services/tour.service';
import { GalleryPhoto, Photo } from '@core/models/photo';
import { DEFAULT_EVENT_KEY } from '@core/constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly sessionService = inject(SessionService);
  private readonly logger = inject(LoggerService);
  readonly photoLimitService = inject(PhotoLimitService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly tourService = inject(TourService);

  /** This device's ID — used for ownership checks */
  readonly myDeviceId = signal(this.sessionService.getDeviceId());

  /** ALL photos from ALL guests (newest first) */
  readonly globalPhotos = signal<GalleryPhoto[]>([]);

  /** Loading state */
  readonly isLoading = signal<boolean>(true);

  // Tab State (Signals)

  /** Active tab: 'global' or 'personal' */
  readonly activeTab = signal<'global' | 'personal'>('global');

  /** Personal gallery — derived from globalPhotos, zero extra queries */
  readonly myPhotos = computed(() =>
    this.globalPhotos().filter(photo => photo.device_id === this.myDeviceId())
  );

  // Real-Time

  /** Supabase Realtime channel reference for cleanup */
  private realtimeChannel: RealtimeChannel | null = null;

  // Gallery Upload

  /** Hidden file input reference (Signal-based viewChild) */
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

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

  async ngOnInit(): Promise<void> {
    await this.loadPhotos();
    this.setupRealtimeSubscription();
    // Demo mode (no ?e= param → event_key resolves to 'demo'): run the
    // one-time guided tour. maybeStart() no-ops if it already ran or is active,
    // so navigating back here mid-tour (step 5) won't restart it.
    this.tourService.maybeStart(this.sessionService.getStoredEventKey() === DEFAULT_EVENT_KEY);
  }

  ngOnDestroy(): void {
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
    this.isLoading.set(true);
    try {
      const photos = await this.supabaseService.fetchAllPhotos();
      // Map photos to include public URLs
      const photosWithUrls = photos.map((photo: Photo) => ({
        ...photo,
        publicUrl: this.supabaseService.getPhotoPublicUrl(photo.url),
      }));
      this.globalPhotos.set(photosWithUrls);
    } catch (error) {
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
        const photoWithUrl = {
          ...newPhoto,
          publicUrl: this.supabaseService.getPhotoPublicUrl(newPhoto.url),
        };
        this.globalPhotos.update(photos => [photoWithUrl, ...photos]);
      },
      // On DELETE — remove the deleted photo
      (oldPhoto: Photo) => {
        this.globalPhotos.update(photos =>
          photos.filter(p => p.id !== oldPhoto.id)
        );
      }
    );
  }

  /** Intercepts camera/upload actions if limit is reached */
  handleActionClick(action: 'camera' | 'upload'): void {
    if (this.photoLimitService.photosLeft() > 0) {
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
    this.feedbackService.triggerButtonPress();
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
    const index = this.globalPhotos().findIndex(p => p.id === photo.id);
    this.selectedPhotoIndex.set(index >= 0 ? index : 0);
    this.viewerPhotoVisible.set(true);
    this.selectedPhoto.set(photo);
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(false);
    this.isDownloading.set(false);
    this.feedbackService.triggerButtonPress();
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
    const photos = this.globalPhotos();
    if (!photos.length) return;
    const newIndex = (this.selectedPhotoIndex() + direction + photos.length) % photos.length;
    this.feedbackService.triggerButtonPress();
    if (this.navTimeoutId) clearTimeout(this.navTimeoutId);
    this.viewerPhotoVisible.set(false);
    this.navTimeoutId = setTimeout(() => {
      this.navTimeoutId = null;
      this.selectedPhotoIndex.set(newIndex);
      this.selectedPhoto.set(photos[newIndex]);
      this.isConfirmingDelete.set(false);
      this.viewerPhotoVisible.set(true);
    }, 150);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.selectedPhoto()) return;
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
      this.globalPhotos.update(current => current.filter(p => p.id !== photo.id));

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
