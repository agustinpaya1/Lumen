import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';
import { PhotoLimitService } from './photo-limit.service';

/**
 * The remaining-count signal is built in a field initializer, so localStorage
 * has to be in place BEFORE the service is constructed. Every test therefore
 * seeds storage first and injects last, via this helper.
 */
function injectWithStored(stored: string | null): PhotoLimitService {
  if (stored === null) {
    localStorage.removeItem(PHOTOS_REMAINING_KEY);
  } else {
    localStorage.setItem(PHOTOS_REMAINING_KEY, stored);
  }
  TestBed.configureTestingModule({});
  return TestBed.inject(PhotoLimitService);
}

describe('PhotoLimitService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('initial count', () => {
    it('starts at the default quota when nothing is stored', () => {
      expect(injectWithStored(null).photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
    });

    it('restores a previously persisted count', () => {
      expect(injectWithStored('3').photosLeft()).toBe(3);
    });

    it('falls back to the default when the stored value is not a number', () => {
      expect(injectWithStored('abc').photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
    });

    it('reports no quota left when the stored count is zero', () => {
      const service = injectWithStored('0');
      expect(service.photosLeft()).toBe(0);
      expect(service.canTakePhoto()).toBe(false);
    });

    it('clamps a negative stored count to zero', () => {
      // A tampered or corrupted value must not produce a negative quota, which
      // would make photosTaken exceed the maximum.
      const service = injectWithStored('-1');
      expect(service.photosLeft()).toBe(0);
      expect(service.canTakePhoto()).toBe(false);
      expect(service.photosTaken()).toBe(DEFAULT_PHOTO_LIMIT);
    });

    it('clamps a stored count above the maximum', () => {
      const service = injectWithStored(String(DEFAULT_PHOTO_LIMIT + 89));
      expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
      expect(service.photosTaken()).toBe(0);
    });
  });

  describe('decrementCount', () => {
    it('consumes one unit of quota and persists it', () => {
      const service = injectWithStored(null);
      service.decrementCount();

      expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT - 1);
      expect(localStorage.getItem(PHOTOS_REMAINING_KEY)).toBe(
        String(DEFAULT_PHOTO_LIMIT - 1)
      );
    });

    it('does not go below zero, and does not write when already exhausted', () => {
      const service = injectWithStored('0');
      const setItem = vi.spyOn(localStorage, 'setItem');

      service.decrementCount();

      expect(service.photosLeft()).toBe(0);
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  describe('incrementCount', () => {
    it('restores one unit of quota when a photo is deleted', () => {
      const service = injectWithStored(String(DEFAULT_PHOTO_LIMIT - 1));
      service.incrementCount();

      expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
      expect(localStorage.getItem(PHOTOS_REMAINING_KEY)).toBe(
        String(DEFAULT_PHOTO_LIMIT)
      );
    });

    it('never exceeds the maximum, and does not write when already full', () => {
      const service = injectWithStored(String(DEFAULT_PHOTO_LIMIT));
      const setItem = vi.spyOn(localStorage, 'setItem');

      service.incrementCount();

      expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  it('resets the counter back to a full quota and persists it', () => {
    const service = injectWithStored('2');
    service.resetCount();

    expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
    expect(localStorage.getItem(PHOTOS_REMAINING_KEY)).toBe(String(DEFAULT_PHOTO_LIMIT));
  });

  it('derives photosTaken as the complement of photosLeft', () => {
    const service = injectWithStored(null);

    expect(service.photosTaken()).toBe(0);
    service.decrementCount();
    service.decrementCount();
    expect(service.photosTaken()).toBe(2);
    expect(service.photosLeft() + service.photosTaken()).toBe(service.maxPhotos);
  });

  it('survives a browser where localStorage is unavailable', () => {
    // Safari private mode and SSR/test contexts: construction and persistence
    // must degrade silently rather than throw.
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    TestBed.configureTestingModule({});
    const service = TestBed.inject(PhotoLimitService);

    expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
    expect(() => service.decrementCount()).not.toThrow();
    expect(getItem).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
  });
});
