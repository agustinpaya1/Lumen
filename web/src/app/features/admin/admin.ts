import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@core/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ADMIN_AUTH_KEY } from '@core/constants';
import { Photo } from '@core/models/photo';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly supabaseService = inject(SupabaseService);

  // Auth state
  readonly isAuthenticated = signal<boolean>(false);
  readonly pinInput = signal<string>('');
  readonly authError = signal<string | null>(null);

  // Admin state
  readonly photos = signal<Photo[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly deleteConfirmId = signal<number | null>(null);

  // Realtime subscription
  private realtimeChannel: RealtimeChannel | null = null;

  // PIN constant
  private readonly ADMIN_PIN = '2102';

  ngOnInit(): void {
    // Check if already authenticated in session
    const isAuth = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (isAuth === 'true') {
      this.isAuthenticated.set(true);
      this.loadPhotos();
      this.setupRealtimeSubscription();
    }
  }

  ngOnDestroy(): void {
    this.cleanupRealtimeSubscription();
  }

  /**
   * Verify PIN and authenticate
   */
  authenticate(): void {
    const pin = this.pinInput();

    if (pin === this.ADMIN_PIN) {
      this.isAuthenticated.set(true);
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      this.authError.set(null);
      this.pinInput.set('');

      // Load photos and setup realtime
      this.loadPhotos();
      this.setupRealtimeSubscription();
    } else {
      this.authError.set('Invalid PIN. Please try again.');
    }
  }

  /**
   * Handle PIN input changes
   */
  onPinInput(value: string): void {
    // Only allow digits, max 4 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    this.pinInput.set(cleaned);
    this.authError.set(null);
  }

  /**
   * Logout from admin
   */
  logout(): void {
    this.isAuthenticated.set(false);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    this.photos.set([]);
    this.cleanupRealtimeSubscription();
  }

  /**
   * Load all photos from Supabase
   */
  async loadPhotos(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const photos = await this.supabaseService.fetchPhotos();
      this.photos.set(photos);
    } catch (error) {
      console.error('Error loading photos:', error);
      this.errorMessage.set('Failed to load photos. Please refresh.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Setup Realtime subscription for new photos
   */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabaseService.subscribeToPhotos((newPhoto: Photo) => {
      // Add new photo to the beginning of the array
      this.photos.update(current => [newPhoto, ...current]);
    });
  }

  /**
   * Cleanup Realtime subscription
   */
  private cleanupRealtimeSubscription(): void {
    if (this.realtimeChannel) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Show delete confirmation modal
   */
  confirmDelete(photoId: number): void {
    this.deleteConfirmId.set(photoId);
  }

  /**
   * Cancel delete operation
   */
  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  /**
   * Delete photo from DB and Storage
   */
  async deletePhoto(photoId: number): Promise<void> {
    try {
      const photo = this.photos().find(p => p.id === photoId);
      if (!photo) return;

      this.errorMessage.set(null);

      // Delete from Supabase (DB + Storage)
      await this.supabaseService.deletePhoto(photoId, photo.url);

      // Remove from local state
      this.photos.update(current => current.filter(p => p.id !== photoId));
      this.deleteConfirmId.set(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      this.errorMessage.set('Failed to delete photo. Please try again.');
      this.deleteConfirmId.set(null);
    }
  }

  /**
   * Download photo
   */
  async downloadPhoto(photo: Photo): Promise<void> {
    try {
      this.errorMessage.set(null);

      // Get signed download URL
      const downloadUrl = await this.supabaseService.getPhotoDownloadUrl(photo.url);

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `lumen_photo_${photo.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading photo:', error);
      this.errorMessage.set('Failed to download photo. Please try again.');
    }
  }

  /**
   * Get photo thumbnail URL
   */
  getPhotoUrl(path: string): string {
    return this.supabaseService.getPhotoPublicUrl(path);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
