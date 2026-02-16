import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
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
      created_at: new Date()
    });
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
}