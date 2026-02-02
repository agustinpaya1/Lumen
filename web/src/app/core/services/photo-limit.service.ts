import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'lumen_photos_remaining';
const DEFAULT_PHOTO_LIMIT = 10;

@Injectable({
    providedIn: 'root'
})
export class PhotoLimitService {
    private readonly photoCountSignal = signal<number>(this.initializeCount());

    /**
     * Readonly signal exposing the number of photos left
     */
    readonly photosLeft = this.photoCountSignal.asReadonly();

    /**
     * Computed signal that returns true if the user can take more photos
     */
    readonly canTakePhoto = computed(() => this.photoCountSignal() > 0);

    /**
     * Initialize the photo count from localStorage or use default
     */
    private initializeCount(): number {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const parsed = parseInt(stored, 10);
            return isNaN(parsed) ? DEFAULT_PHOTO_LIMIT : parsed;
        }
        return DEFAULT_PHOTO_LIMIT;
    }

    /**
     * Decrement the photo count and persist to localStorage
     */
    decrementCount(): void {
        const currentCount = this.photoCountSignal();
        if (currentCount > 0) {
            const newCount = currentCount - 1;
            this.photoCountSignal.set(newCount);
            localStorage.setItem(STORAGE_KEY, newCount.toString());
        }
    }

    /**
     * Reset the photo count to the default limit (useful for testing)
     */
    resetCount(): void {
        this.photoCountSignal.set(DEFAULT_PHOTO_LIMIT);
        localStorage.setItem(STORAGE_KEY, DEFAULT_PHOTO_LIMIT.toString());
    }
}
