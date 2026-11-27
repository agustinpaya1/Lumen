import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PHOTO_LIMIT, PHOTOS_REMAINING_KEY } from '@core/constants';
import { EventService } from './event.service';
import { SessionService } from './session.service';
import { PhotoLimitService } from './photo-limit.service';

describe('PhotoLimitService', () => {
  const eventKey = 'javier-paula-2026';
  const eventStorageKey = `${PHOTOS_REMAINING_KEY}:${eventKey}`;

  const limit = signal(DEFAULT_PHOTO_LIMIT);

  beforeEach(() => {
    localStorage.clear();
    limit.set(DEFAULT_PHOTO_LIMIT);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PhotoLimitService,
        { provide: EventService, useValue: { photoLimit: limit } },
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
    expect(localStorage.getItem(eventStorageKey)).toBe('used:1');
  });

  it('clamps a tampered stored quota', () => {
    localStorage.setItem(eventStorageKey, '999');

    expect(TestBed.inject(PhotoLimitService).photosLeft()).toBe(DEFAULT_PHOTO_LIMIT);
  });

  it('applies a new limit while preserving usage, including after a reload', () => {
    localStorage.setItem(eventStorageKey, 'used:2');
    const service = TestBed.inject(PhotoLimitService);

    limit.set(1);
    expect(service.photosLeft()).toBe(0);
    expect(service.canTakePhoto()).toBe(false);

    limit.set(20);
    expect(service.photosLeft()).toBe(18);
    service.decrementCount();
    expect(localStorage.getItem(eventStorageKey)).toBe('used:3');
  });
});
