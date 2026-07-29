import { Injectable, signal, computed } from '@angular/core';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';

/**
 * Regulates per-device photo usage by maintaining a reactive counter backed by
 * localStorage.  Prevents abuse and ensures every guest gets a fair share of
 * the upload quota.
 */
@Injectable({
  providedIn: 'root'
})
export class PhotoLimitService {
  private readonly photoCountSignal = signal<number>(this.initializeCount());

  /** Remaining photos this device is allowed to upload. */
  readonly photosLeft = this.photoCountSignal.asReadonly();

  /** Whether the device still has upload quota left. */
  readonly canTakePhoto = computed(() => this.photoCountSignal() > 0);

  /** Maximum photos allowed per device (sourced from constants). */
  readonly maxPhotos = DEFAULT_PHOTO_LIMIT;

  /** Number of photos already uploaded from this device. */
  readonly photosTaken = computed(() => this.maxPhotos - this.photoCountSignal());

  private initializeCount(): number {
    // localStorage is absent in SSR environments and can be blocked by the
    // browser — fall back to the default rather than throwing during construction.
    if (typeof localStorage === 'undefined') {
      return DEFAULT_PHOTO_LIMIT;
    }
    let stored: string | null;
    try {
      stored = localStorage.getItem(PHOTOS_REMAINING_KEY);
    } catch {
      // Safari private mode throws on access rather than returning null.
      return DEFAULT_PHOTO_LIMIT;
    }
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? DEFAULT_PHOTO_LIMIT : this.clamp(parsed);
    }
    return DEFAULT_PHOTO_LIMIT;
  }

  /**
   * Constrains a restored count to [0, DEFAULT_PHOTO_LIMIT]. The stored value is
   * user-writable, so a tampered or corrupted entry must not yield a negative
   * quota (which would push photosTaken above the maximum) nor an inflated one.
   *
   * This is a UX guard only — the authoritative limit is enforced server-side.
   */
  private clamp(count: number): number {
    return Math.min(Math.max(count, 0), DEFAULT_PHOTO_LIMIT);
  }

  /** Consumes one unit of quota after a successful upload, persisting to localStorage. */
  decrementCount(): void {
    const currentCount = this.photoCountSignal();
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      this.photoCountSignal.set(newCount);
      this.persist(newCount);
    }
  }

  /** Restores one unit of quota when the user deletes one of their own photos. */
  incrementCount(): void {
    const currentCount = this.photoCountSignal();
    if (currentCount < DEFAULT_PHOTO_LIMIT) {
      const newCount = currentCount + 1;
      this.photoCountSignal.set(newCount);
      this.persist(newCount);
    }
  }

  /** Resets the counter to the full DEFAULT_PHOTO_LIMIT quota. */
  resetCount(): void {
    this.photoCountSignal.set(DEFAULT_PHOTO_LIMIT);
    this.persist(DEFAULT_PHOTO_LIMIT);
  }

  /** Persists the remaining count, skipping write when localStorage is unavailable. */
  private persist(count: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(PHOTOS_REMAINING_KEY, count.toString());
    } catch {
      // Quota exceeded or blocked storage: the in-memory signal stays correct
      // for this session, which is enough to keep the UI consistent.
    }
  }
}
