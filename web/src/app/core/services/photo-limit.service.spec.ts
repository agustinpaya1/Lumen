import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';
import { SessionService } from './session.service';
import { PhotoLimitService } from './photo-limit.service';

describe('PhotoLimitService', () => {
  const eventKey = 'javier-paula-2026';
  const eventStorageKey = `${PHOTOS_REMAINING_KEY}:${eventKey}`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PhotoLimitService,
        {
          provide: SessionService,
          useValue: { getStoredEventKey: () => eventKey },
        },
      ],
    });
  });

  it('restores the quota for the active event only', () => {
    localStorage.setItem(eventStorageKey, '4');
    localStorage.setItem(`${PHOTOS_REMAINING_KEY}:another-event`, '1');

    expect(TestBed.inject(PhotoLimitService).photosLeft()).toBe(4);
  });

  it('does not carry the legacy global quota into a new event', () => {
    localStorage.setItem(PHOTOS_REMAINING_KEY, '0');

    expect(TestBed.inject(PhotoLimitService).photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
  });

  it('persists decrements under the active event key', () => {
    const service = TestBed.inject(PhotoLimitService);

    service.decrementCount();

    expect(service.photosLeft()).toBe(DEFAULT_PHOTO_LIMIT - 1);
    expect(localStorage.getItem(eventStorageKey)).toBe(String(DEFAULT_PHOTO_LIMIT - 1));
  });

  it('clamps a tampered stored quota', () => {
    localStorage.setItem(eventStorageKey, '999');

    expect(TestBed.inject(PhotoLimitService).photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
  });
});
