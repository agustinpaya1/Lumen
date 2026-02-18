import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  /** localStorage key for the anonymous device identifier */
  private readonly DEVICE_ID_KEY = 'lumen_device_id';

  /** In-memory cache — guarantees the same value across all calls within a session */
  private cachedDeviceId: string | null = null;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // ====================
  // DEVICE ID
  // ====================

  /**
   * Get or generate a unique device ID for anonymous photo ownership.
   * 1. Returns in-memory cache (prevents multiple localStorage reads).
   * 2. Falls back to localStorage.
   * 3. Generates a new UUID v4 only if nothing is stored.
   * Guarantees the SAME string every time within a browser session.
   */
  getDeviceId(): string {
    // 1. Return cached ID if it exists (avoids localStorage reads on every call)
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    // 2. SSR safety guard (pure CSR app, but safe for Vercel edge cases)
    if (typeof window === 'undefined') {
      return 'ssr-fallback';
    }

    // 3. Read from localStorage
    let storedId = localStorage.getItem(this.DEVICE_ID_KEY);

    // 4. Generate if not found
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem(this.DEVICE_ID_KEY, storedId);
    }

    // 5. Cache in memory and return
    this.cachedDeviceId = storedId;
    return storedId;
  }

  get client() {
    return this.supabase;
  }

  /**
   * Helper: Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Base upload method (no retry logic)
   */
  async uploadPhoto(file: File, path: string) {
    return this.supabase.storage
      .from('photos')
      .upload(path, file);
  }

  /**
   * Upload photo with retry mechanism and exponential backoff
   * Retries 3 times with delays: 1s, 2s, 4s
   * @param file - The file to upload
   * @param path - The storage path
   * @param onRetry - Optional callback when retry occurs (for UI feedback)
   * @returns Upload result or throws error after all retries exhausted
   */
  async uploadPhotoWithRetry(
    file: File,
    path: string,
    onRetry?: (attemptNumber: number, maxAttempts: number) => void
  ) {
    const maxAttempts = 3;
    const backoffDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.uploadPhoto(file, path);

        // Success! Return immediately
        if (!result.error) {
          return result;
        }

        // Supabase returned an error in the result
        lastError = result.error;

        // Don't retry on final attempt
        if (attempt === maxAttempts) {
          throw result.error;
        }

        // Notify UI about retry
        if (onRetry) {
          onRetry(attempt, maxAttempts);
        }

        // Wait before retrying (exponential backoff)
        await this.delay(backoffDelays[attempt - 1]);

      } catch (error) {
        lastError = error;

        // Don't retry on final attempt
        if (attempt === maxAttempts) {
          throw error;
        }

        // Notify UI about retry
        if (onRetry) {
          onRetry(attempt, maxAttempts);
        }

        // Wait before retrying (exponential backoff)
        await this.delay(backoffDelays[attempt - 1]);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Base save photo data method (no retry logic)
   */
  async savePhotoData(url: string, eventId: string) {
    return this.supabase.from('photos').insert({
      url: url,
      event_id: eventId,
      device_id: this.getDeviceId(),
      created_at: new Date()
    }).select();
  }

  /**
   * Save photo metadata with retry mechanism
   * @param url - Photo URL
   * @param eventId - Event/dedication ID
   * @param onRetry - Optional callback when retry occurs
   * @returns Insert result or throws error after retries
   */
  async savePhotoDataWithRetry(
    url: string,
    eventId: string,
    onRetry?: (attemptNumber: number, maxAttempts: number) => void
  ) {
    const maxAttempts = 3;
    const backoffDelays = [1000, 2000, 4000];

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.savePhotoData(url, eventId);

        // Success!
        if (!result.error) {
          return result;
        }

        lastError = result.error;

        if (attempt === maxAttempts) {
          throw result.error;
        }

        if (onRetry) {
          onRetry(attempt, maxAttempts);
        }

        await this.delay(backoffDelays[attempt - 1]);

      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        if (onRetry) {
          onRetry(attempt, maxAttempts);
        }

        await this.delay(backoffDelays[attempt - 1]);
      }
    }

    throw lastError;
  }

  // ====================
  // ADMIN METHODS
  // ====================

  /**
   * Fetch all photos from the database (for admin dashboard)
   * @returns Array of photo objects ordered by created_at descending
   */
  async fetchPhotos() {
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Subscribe to real-time photo inserts (for admin dashboard)
   * @param callback - Function to call when new photo is inserted
   * @returns RealtimeChannel for cleanup
   */
  subscribeToPhotos(callback: (photo: any) => void) {
    const channel = this.supabase
      .channel('photos_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Delete photo from both database and storage (for admin dashboard)
   * @param photoId - Photo ID to delete from database
   * @param photoPath - Photo path in storage to delete
   */
  async deletePhoto(photoId: number, photoPath: string) {
    // Delete from storage first
    const { error: storageError } = await this.supabase.storage
      .from('photos')
      .remove([photoPath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      throw storageError;
    }

    // Then delete from database
    const { error: dbError } = await this.supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      throw dbError;
    }
  }

  /**
   * Get signed download URL for a photo (for admin dashboard)
   * @param path - Photo path in storage
   * @returns Signed download URL
   */
  async getPhotoDownloadUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('photos')
      .createSignedUrl(path, 60); // Valid for 60 seconds

    if (error || !data) {
      throw error || new Error('Failed to generate download URL');
    }

    return data.signedUrl;
  }

  /**
   * Download an image as a Blob to force-save on mobile devices.
   * Using <a download> with cross-origin Supabase URLs fails on mobile
   * (opens in new tab). This fetches as Blob and triggers a real download.
   * @param url - Public or signed URL of the image
   * @param filename - Desired filename for the download
   */
  async downloadImageAsBlob(url: string, filename: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Small delay before revoking to ensure download starts
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  // ====================
  // GALLERY METHODS
  // ====================

  /**
   * Fetch photos belonging to the current device
   * @returns Array of photo objects for this device, ordered by newest first
   */
  async fetchMyPhotos() {
    const deviceId = this.getDeviceId();
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my photos:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get public URL for a photo in storage
   * @param path - Photo path in storage (e.g., 'uploads/photo_123.jpg')
   * @returns Public URL string
   */
  getPhotoPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from('photos')
      .getPublicUrl(path);
    return data.publicUrl;
  }

  // ====================
  // LIVE GALLERY METHODS
  // ====================

  /**
   * Fetch ALL photos from all guests, ordered newest first.
   * Used by the Home "Galería en Vivo" screen.
   */
  async fetchAllPhotos() {
    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all photos:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to real-time INSERT and DELETE events on the photos table.
   * Uses a dedicated channel ('home:photos') so it doesn't collide with admin.
   * @param onInsert - Called when a new photo is inserted
   * @param onDelete - Called when a photo is deleted (receives the old row)
   * @returns RealtimeChannel for cleanup in ngOnDestroy
   */
  subscribeToAllPhotos(
    onInsert: (photo: any) => void,
    onDelete: (photo: any) => void
  ) {
    const channel = this.supabase
      .channel('home:photos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos' },
        (payload) => {
          onInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'photos' },
        (payload) => {
          onDelete(payload.old);
        }
      )
      .subscribe();

    return channel;
  }
}