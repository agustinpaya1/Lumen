import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'lumen_photos_remaining';
const DEFAULT_PHOTO_LIMIT = 10;

@Injectable({
    providedIn: 'root'
})
export class PhotoLimitService {
    private readonly photoCountSignal = signal<number>(this.initializeCount());
    readonly photosLeft = this.photoCountSignal.asReadonly();
    readonly canTakePhoto = computed(() => this.photoCountSignal() > 0);

    private initializeCount(): number {
        const stored = localStorage.getItem(STORAGE_KEY);
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
            localStorage.setItem(STORAGE_KEY, newCount.toString());
        }
    }

    resetCount(): void {
        this.photoCountSignal.set(DEFAULT_PHOTO_LIMIT);
        localStorage.setItem(STORAGE_KEY, DEFAULT_PHOTO_LIMIT.toString());
    }
}
