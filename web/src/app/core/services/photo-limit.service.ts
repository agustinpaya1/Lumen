import { Injectable, signal, computed } from '@angular/core';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';

@Injectable({
  providedIn: 'root'
})
export class PhotoLimitService {
  private readonly photoCountSignal = signal<number>(this.initializeCount());
  readonly photosLeft = this.photoCountSignal.asReadonly();
  readonly canTakePhoto = computed(() => this.photoCountSignal() > 0);
  readonly maxPhotos = DEFAULT_PHOTO_LIMIT;
  readonly photosTaken = computed(() => this.maxPhotos - this.photoCountSignal());

  private initializeCount(): number {
    // localStorage is absent in SSR/test environments and can be blocked by the
    // browser — fall back to the default rather than throwing during construction.
    if (typeof localStorage === 'undefined') {
      return DEFAULT_PHOTO_LIMIT;
    }
    const stored = localStorage.getItem(PHOTOS_REMAINING_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? DEFAULT_PHOTO_LIMIT : parsed;
    }
    return DEFAULT_PHOTO_LIMIT;
  }

  decrementCount(): void {
    const currentCount = this.photoCountSignal();
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      this.photoCountSignal.set(newCount);
      this.persist(newCount);
    }
  }

  incrementCount(): void {
    const currentCount = this.photoCountSignal();
    if (currentCount < DEFAULT_PHOTO_LIMIT) {
      const newCount = currentCount + 1;
      this.photoCountSignal.set(newCount);
      this.persist(newCount);
    }
  }

  resetCount(): void {
    this.photoCountSignal.set(DEFAULT_PHOTO_LIMIT);
    this.persist(DEFAULT_PHOTO_LIMIT);
  }

  /** Persists the remaining count, skipping write when localStorage is unavailable. */
  private persist(count: number): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PHOTOS_REMAINING_KEY, count.toString());
    }
  }
}
