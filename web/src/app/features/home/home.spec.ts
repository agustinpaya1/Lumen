import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeComponent } from './home';
import { Photo } from '@core/models/photo';
import { SupabaseService } from '@core/services/supabase.service';
import { SessionService } from '@core/services/session.service';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { UploadQueueService } from '@core/services/upload-queue.service';
import { FeedbackService } from '@core/services/feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { TourService } from '@features/tour/tour.service';
import { EventService } from '@core/services/event.service';
import { AnalyticsService } from '@core/services/analytics.service';

describe('Home gallery consistency', () => {
  let home: HomeComponent;
  let onInsert: (photo: Photo) => void;
  let onDelete: (photo: Pick<Photo, 'id'>) => void;
  const photo = (id: number, device = 'mine'): Photo => ({
    id,
    device_id: device,
    url: `${id}.jpg`,
    dedication: '',
    event_key: 'test-event',
    created_at: '2026-09-12T12:00:00Z',
  });
  const fetchAllPhotos = vi.fn();
  const track = vi.fn();

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fetchAllPhotos.mockReset().mockResolvedValue([photo(3), photo(2, 'another-guest'), photo(1)]);
    track.mockReset();
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        {
          provide: EventService,
          useValue: { canUpload: signal(true), initialize: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: SessionService,
          useValue: { getDeviceId: () => 'mine', getStoredEventKey: () => 'test-event' },
        },
        {
          provide: SupabaseService,
          useValue: {
            fetchAllPhotos,
            getPhotoPublicUrl: (path: string) => `https://example.test/${path}`,
            subscribeToAllPhotos: (insert: typeof onInsert, remove: typeof onDelete) => {
              onInsert = insert;
              onDelete = remove;
              return {};
            },
            client: { removeChannel: vi.fn() },
          },
        },
        { provide: PhotoLimitService, useValue: { photosLeft: signal(10) } },
        {
          provide: UploadQueueService,
          useValue: {
            initialize: vi.fn().mockResolvedValue(undefined),
            processPending: vi.fn().mockResolvedValue(undefined),
            isOnline: signal(true),
          },
        },
        { provide: FeedbackService, useValue: { triggerButtonPress: vi.fn() } },
        { provide: LoggerService, useValue: { error: vi.fn(), warn: vi.fn() } },
        { provide: TourService, useValue: { maybeStart: vi.fn() } },
        { provide: AnalyticsService, useValue: { track } },
      ],
    }).overrideComponent(HomeComponent, { set: { template: '' } });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    home = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    home?.ngOnDestroy();
    vi.useRealTimers();
  });

  it('keeps existing photos and signals an error when a refresh loses connection', async () => {
    fetchAllPhotos.mockRejectedValueOnce(new Error('network unavailable'));
    await home.loadPhotos();
    expect(home.globalPhotos().length).toBe(3);
    expect(home.loadError()).toBe(true);
    expect(home.isLoading()).toBe(false);
  });

  it('deduplicates live inserts and closes a viewer whose photo is deleted remotely', () => {
    onInsert(photo(3));
    expect(home.globalPhotos().length).toBe(3);
    home.openViewer(home.globalPhotos()[0]);
    onDelete({ id: 999 });
    expect(home.selectedPhoto()?.id).toBe(3);
    onDelete({ id: 3 });
    expect(home.globalPhotos().map((p) => p.id)).toEqual([2, 1]);
    expect(home.selectedPhoto()).toBeNull();
  });

  it('keeps viewer navigation inside the personal filter', () => {
    vi.useFakeTimers();
    home.setTab('personal');
    home.openViewer(home.myPhotos()[0]);
    home.navigatePhoto(1);
    vi.advanceTimersByTime(150);
    expect(home.selectedPhoto()?.id).toBe(1);
  });

  it('distributes natural-size photos across independent masonry lanes', () => {
    expect(home.photoColumns().map((column) => column.map((p) => p.id))).toEqual([[3, 1], [2]]);
    home.setTab('personal');
    expect(home.photoColumns().map((column) => column.map((p) => p.id))).toEqual([[3], [1]]);
  });

  it('reports only product actions through the analytics contract', () => {
    expect(track).toHaveBeenCalledWith('home_view', {
      viewportWidth: window.innerWidth,
      online: true,
      hasPhotos: true,
    });
    home.setTab('personal');
    home.openViewer(home.myPhotos()[0]);
    home.handleActionClick('camera');
    expect(track.mock.calls.map(([name]) => name)).toEqual(
      expect.arrayContaining(['filter_change', 'photo_open', 'capture_tap']),
    );
  });

  it('opens sharing with an album QR before invoking another share action', async () => {
    await home.shareAlbum();

    expect(home.shareQrOpen()).toBe(true);
    expect(home.shareUrl()).toContain('?e=test-event');
    expect(home.shareQrDataUrl()).toMatch(/^data:image\/svg\+xml/);
    expect(track).toHaveBeenCalledWith(
      'share_qr_open',
      expect.objectContaining({ hasPhotos: true }),
    );
  });

  it('copies the canonical album link from the QR dialog', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await home.shareAlbum();
    await home.copyShareLink();

    expect(writeText).toHaveBeenCalledWith(home.shareUrl());
    expect(home.shareCopied()).toBe(true);
    expect(track).toHaveBeenCalledWith(
      'share_qr_copy',
      expect.objectContaining({ hasPhotos: true }),
    );
  });

  it('clears the gallery on pause and reloads automatically when reopened', async () => {
    TestBed.tick();
    const event = TestBed.inject(EventService);
    (event.canUpload as ReturnType<typeof signal<boolean>>).set(false);
    TestBed.tick();
    expect(home.globalPhotos()).toEqual([]);
    fetchAllPhotos.mockClear();
    await home.loadPhotos();
    expect(fetchAllPhotos).not.toHaveBeenCalled();
    (event.canUpload as ReturnType<typeof signal<boolean>>).set(true);
    TestBed.tick();
    await Promise.resolve();
    expect(fetchAllPhotos).toHaveBeenCalledOnce();
    expect(home.globalPhotos().length).toBe(3);
  });
});
