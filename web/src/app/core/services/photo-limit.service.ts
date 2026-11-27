import { Injectable, signal, computed, inject } from '@angular/core';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';
import { EventService } from './event.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class PhotoLimitService {
  private readonly event = inject(EventService);
  private readonly session = inject(SessionService);
  // Store usage so changes to the event limit preserve the number already taken.
  private readonly used = signal(this.readUsed());

  readonly photosLeft = computed(() => Math.max(0, this.maxPhotos - this.used()));
  readonly canTakePhoto = computed(() => this.photosLeft() > 0);
  readonly photosTaken = this.used.asReadonly();

  get maxPhotos(): number {
    return this.event.photoLimit();
  }

  decrementCount(): void {
    if (this.canTakePhoto()) this.persist(this.used() + 1);
  }

  incrementCount(): void {
    if (this.used() > 0) this.persist(this.used() - 1);
  }

  resetCount(): void {
    this.persist(0);
  }

  private readUsed(): number {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return 0;
      if (stored.startsWith('used:')) {
        const count = Number(stored.slice(5));
        return Number.isSafeInteger(count) && count >= 0 ? count : 0;
      }

      // Older clients stored how many photos remained out of the fixed quota.
      const remaining = Number.parseInt(stored, 10);
      return Number.isNaN(remaining) ? 0 : DEFAULT_PHOTO_LIMIT - Math.max(0, Math.min(DEFAULT_PHOTO_LIMIT, remaining));
    } catch {
      return 0;
    }
  }

  private persist(used: number): void {
    this.used.set(used);
    try {
      localStorage.setItem(this.storageKey, `used:${used}`);
    } catch {
      // The in-memory counter still works when browser storage is unavailable.
    }
  }

  private get storageKey(): string {
    return `${PHOTOS_REMAINING_KEY}:${this.session.getStoredEventKey()}`;
  }
}
