import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@environments/environment';
import {
  ADMIN_PHOTOS_CHANNEL,
  HOME_PHOTOS_CHANNEL,
  PHOTOS_BUCKET,
  PHOTOS_TABLE,
  RETRY_BACKOFF_DELAYS_MS,
  RETRY_MAX_ATTEMPTS,
  SIGNED_URL_TTL_SECONDS,
} from '@core/constants';
import { Photo } from '@core/models/photo';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly session = inject(SessionService);
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get client() {
    return this.supabase;
  }

  /** Resolves after `ms` milliseconds — used to space out retry attempts. */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Runs a Supabase operation up to RETRY_MAX_ATTEMPTS times with exponential
   * backoff, so a flaky guest connection doesn't lose a capture. Both a thrown
   * error and a Supabase `{ error }` result count as a retryable failure; the
   * last error is rethrown once attempts are exhausted.
   * @param operation Produces a fresh Supabase result on each attempt.
   * @param onRetry Optional hook invoked before each backoff wait (UI feedback).
   * @returns The first result whose `error` is empty.
   */
  private async withRetry<T extends { error: unknown }>(
    operation: () => Promise<T>,
    onRetry?: (attemptNumber: number, maxAttempts: number) => void
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await operation();
        if (!result.error) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }

      if (attempt === RETRY_MAX_ATTEMPTS) {
        break;
      }
      onRetry?.(attempt, RETRY_MAX_ATTEMPTS);
      await this.delay(RETRY_BACKOFF_DELAYS_MS[attempt - 1]);
    }

    throw lastError;
  }

  /**
   * Builds a Realtime `postgres_changes` filter for the photos table, scoped to
   * the active event so each subscriber only receives rows from its own event.
   */
  private photoChangeFilter<E extends 'INSERT' | 'UPDATE' | 'DELETE'>(
    event: E,
    eventKey: string
  ) {
    return {
      event,
      schema: 'public',
      table: PHOTOS_TABLE,
      filter: `event_key=eq.${eventKey}`,
    };
  }

  /**
   * Base upload method (no retry logic)
   */
  async uploadPhoto(file: File, path: string) {
    return this.supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, file);
  }

  /**
   * Uploads a photo to storage, retrying transient failures with exponential
   * backoff so a weak guest connection doesn't drop the capture.
   * @param onRetry Optional hook for surfacing retry progress in the UI.
   * @returns The successful Supabase upload result.
   */
  async uploadPhotoWithRetry(
    file: File,
    path: string,
    onRetry?: (attemptNumber: number, maxAttempts: number) => void
  ) {
    return this.withRetry(() => this.uploadPhoto(file, path), onRetry);
  }

  /**
   * Base save photo data method (no retry logic).
   * Scopes the record to the active event via event_key.
   * Note: event_id stores the user's dedication text (unrelated to event routing).
   */
  async savePhotoData(url: string, eventId: string) {
    return this.supabase.from(PHOTOS_TABLE).insert({
      url: url,
      event_id: eventId,
      device_id: this.session.getDeviceId(),
      event_key: this.session.getStoredEventKey(),
      created_at: new Date()
    }).select();
  }

  /**
   * Saves photo metadata, retrying transient failures with exponential backoff.
   * @param eventId Free-text dedication written by the guest (legacy column name).
   * @param onRetry Optional hook for surfacing retry progress in the UI.
   * @returns The successful Supabase insert result.
   */
  async savePhotoDataWithRetry(
    url: string,
    eventId: string,
    onRetry?: (attemptNumber: number, maxAttempts: number) => void
  ) {
    return this.withRetry(() => this.savePhotoData(url, eventId), onRetry);
  }

  // ====================
  // ADMIN METHODS
  // ====================

  /**
   * Fetch all photos for the active event (admin dashboard).
   * Scoped to event_key so the admin only sees photos from their event.
   * @returns Array of photo objects ordered by created_at descending
   */
  async fetchPhotos(): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .eq('event_key', this.session.getStoredEventKey())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Subscribe to real-time photo inserts for the active event (admin dashboard).
   * Filtered by event_key so the admin only receives events from their event.
   * @param callback - Function to call when new photo is inserted
   * @returns RealtimeChannel for cleanup
   */
  subscribeToPhotos(callback: (photo: Photo) => void) {
    const eventKey = this.session.getStoredEventKey();

    return this.supabase
      .channel(ADMIN_PHOTOS_CHANNEL)
      .on('postgres_changes', this.photoChangeFilter('INSERT', eventKey), (payload) => {
        callback(payload.new as Photo);
      })
      .subscribe();
  }

  /**
   * Delete photo from both database and storage.
   * No event_key filter needed — deletion is by primary key (photoId).
   * @param photoId - Photo ID to delete from database
   * @param photoPath - Photo path in storage to delete
   */
  async deletePhoto(photoId: number, photoPath: string) {
    // Delete from storage first
    const { error: storageError } = await this.supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photoPath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      throw storageError;
    }

    // Then delete from database
    const { error: dbError } = await this.supabase
      .from(PHOTOS_TABLE)
      .delete()
      .eq('id', photoId);

    if (dbError) {
      throw dbError;
    }
  }

  /**
   * Get signed download URL for a photo (admin dashboard).
   * @param path - Photo path in storage
   * @returns Signed download URL valid for 60 seconds
   */
  async getPhotoDownloadUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

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
   * Fetch photos belonging to the current device within the active event.
   * Double-filtered by device_id AND event_key.
   * @returns Array of photo objects for this device, ordered by newest first
   */
  async fetchMyPhotos(): Promise<Photo[]> {
    const deviceId = this.session.getDeviceId();
    const { data, error } = await this.supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .eq('device_id', deviceId)
      .eq('event_key', this.session.getStoredEventKey())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my photos:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get public URL for a photo in storage.
   * @param path - Photo path in storage (e.g., 'uploads/photo_123.jpg')
   * @returns Public URL string
   */
  getPhotoPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from(PHOTOS_BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  // ====================
  // LIVE GALLERY METHODS
  // ====================

  /**
   * Fetch ALL photos for the active event, ordered newest first.
   * Scoped to event_key — guests only see photos from their event.
   * Used by the Home "Galería en Vivo" screen.
   */
  async fetchAllPhotos(): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .eq('event_key', this.session.getStoredEventKey())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all photos:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to real-time INSERT and DELETE events for the active event.
   * Filtered by event_key so guests only receive updates from their event.
   * Uses a dedicated channel ('home:photos') to avoid colliding with admin.
   * @param onInsert - Called when a new photo is inserted
   * @param onDelete - Called when a photo is deleted (receives the old row)
   * @returns RealtimeChannel for cleanup in ngOnDestroy
   */
  subscribeToAllPhotos(
    onInsert: (photo: Photo) => void,
    onDelete: (photo: Photo) => void
  ) {
    const eventKey = this.session.getStoredEventKey();

    return this.supabase
      .channel(HOME_PHOTOS_CHANNEL)
      .on('postgres_changes', this.photoChangeFilter('INSERT', eventKey), (payload) => {
        onInsert(payload.new as Photo);
      })
      .on('postgres_changes', this.photoChangeFilter('DELETE', eventKey), (payload) => {
        onDelete(payload.old as Photo);
      })
      .subscribe();
  }
}