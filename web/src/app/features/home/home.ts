import { Component, signal, computed, inject, OnInit, OnDestroy, viewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RealtimeChannel } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import { SupabaseService } from '@core/services/supabase';
import { PhotoLimitService } from '@core/services/photo-limit.service';

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
  readonly photoLimitService = inject(PhotoLimitService);

  /** This device's ID — used for ownership checks */
  readonly myDeviceId = signal(this.supabaseService.getDeviceId());

  /** ALL photos from ALL guests (newest first) */
  readonly globalPhotos = signal<any[]>([]);

  /** Loading state */
  readonly isLoading = signal<boolean>(true);

  /** Total photo limit */
  readonly totalLimit = 10;

  // =====================
  // Tab State (Signals)
  // =====================

  /** Active tab: 'global' or 'personal' */
  readonly activeTab = signal<'global' | 'personal'>('global');

  /** Personal gallery — derived from globalPhotos, zero extra queries */
  readonly myPhotos = computed(() =>
    this.globalPhotos().filter(photo => photo.device_id === this.myDeviceId())
  );

  // =====================
  // Real-Time
  // =====================

  /** Supabase Realtime channel reference for cleanup */
  private realtimeChannel: RealtimeChannel | null = null;

  // =====================
  // Gallery Upload
  // =====================

  /** Hidden file input reference (Signal-based viewChild) */
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Whether a gallery upload is in progress */
  readonly isUploading = signal<boolean>(false);

  /** Whether the limit reached modal is visible */
  readonly showLimitModal = signal<boolean>(false);

  // =====================
  // Photo Viewer Overlay
  // =====================

  /** Currently selected photo for full-screen viewer */
  readonly selectedPhoto = signal<any | null>(null);

  /** Whether delete confirmation is showing */
  readonly isConfirmingDelete = signal<boolean>(false);

  /** Loading state during deletion */
  readonly isDeleting = signal<boolean>(false);

  /** Loading state during download */
  readonly isDownloading = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    await this.loadPhotos();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // =====================
  // Ownership Check
  // =====================

  /** Returns true if the given photo belongs to this device */
  isMyPhoto(photo: any): boolean {
    return photo?.device_id === this.myDeviceId();
  }

  // =====================
  // Data Loading
  // =====================

  /** Load ALL photos from Supabase (global gallery) */
  async loadPhotos(): Promise<void> {
    this.isLoading.set(true);
    try {
      const photos = await this.supabaseService.fetchAllPhotos();
      // Map photos to include public URLs
      const photosWithUrls = photos.map((photo: any) => ({
        ...photo,
        publicUrl: this.supabaseService.getPhotoPublicUrl(photo.url),
      }));
      this.globalPhotos.set(photosWithUrls);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // =====================
  // Real-Time Subscription
  // =====================

  /** Subscribe to INSERT and DELETE events on the photos table */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabaseService.subscribeToAllPhotos(
      // On INSERT — prepend the new photo
      (newPhoto: any) => {
        const photoWithUrl = {
          ...newPhoto,
          publicUrl: this.supabaseService.getPhotoPublicUrl(newPhoto.url),
        };
        this.globalPhotos.update(photos => [photoWithUrl, ...photos]);
      },
      // On DELETE — remove the deleted photo
      (oldPhoto: any) => {
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
  }

  // =====================
  // Gallery Upload Logic
  // =====================

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

  // =====================
  // Viewer Actions
  // =====================

  /** Open the full-screen photo viewer */
  openViewer(photo: any): void {
    this.selectedPhoto.set(photo);
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(false);
    this.isDownloading.set(false);
  }

  /** Close the full-screen photo viewer */
  closeViewer(): void {
    this.selectedPhoto.set(null);
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(false);
    this.isDownloading.set(false);
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
      console.error('Error downloading photo:', error);
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

      // Close the overlay
      this.closeViewer();
    } catch (error) {
      console.error('Error deleting photo:', error);
      this.isDeleting.set(false);
      this.isConfirmingDelete.set(false);
    }
  }
}
