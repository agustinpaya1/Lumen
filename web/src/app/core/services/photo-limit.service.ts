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
      localStorage.setItem(PHOTOS_REMAINING_KEY, newCount.toString());
    }
  }

  incrementCount(): void {
    const currentCount = this.photoCountSignal();
    if (currentCount < DEFAULT_PHOTO_LIMIT) {
      const newCount = currentCount + 1;
      this.photoCountSignal.set(newCount);
      localStorage.setItem(PHOTOS_REMAINING_KEY, newCount.toString());
    }
  }

  resetCount(): void {
    this.photoCountSignal.set(DEFAULT_PHOTO_LIMIT);
    localStorage.setItem(PHOTOS_REMAINING_KEY, DEFAULT_PHOTO_LIMIT.toString());
  }
}
