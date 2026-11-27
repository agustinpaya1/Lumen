import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TvComponent } from './tv';
import { EventService } from '@core/services/event.service';
import { SessionService } from '@core/services/session.service';
import { SupabaseService } from '@core/services/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import { Photo } from '@core/models/photo';

const row = (id: number, event_key = 'clausura-lideres-2026'): Photo => ({
  id, event_key, url: `${id}.jpg`, dedication: '', device_id: 'guest', created_at: '2026-12-03T12:00:00Z',
});

describe('TV live feed', () => {
  let tv: TvComponent;
  let notify: () => void;
  const canUpload = signal(true);
  const fetchTvPhotos = vi.fn();
  const removeChannel = vi.fn();
  const session = { membershipReady: true, ensureAuthSession: vi.fn(), getStoredEventKey: () => 'clausura-lideres-2026' };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
    canUpload.set(true);
    session.membershipReady = true;
    session.ensureAuthSession.mockReset();
    fetchTvPhotos.mockReset().mockResolvedValue([row(1)]);
    removeChannel.mockReset();
    TestBed.configureTestingModule({ providers: [
      { provide: EventService, useValue: { canUpload, name: signal('Clausura de Líderes'), dateLabel: signal('3 de diciembre de 2026'), error: signal(false), waiting: signal(false), initialize: vi.fn(), refresh: vi.fn() } },
      { provide: SessionService, useValue: session },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: LoggerService, useValue: { warn: vi.fn() } },
      { provide: SupabaseService, useValue: {
        fetchTvPhotos, getPhotoPublicUrl: (url: string) => `https://example.test/${url}`,
        subscribeToTvPhotos: (callback: () => void) => { notify = callback; return {}; },
        client: { removeChannel },
      } },
    ] });
    tv = TestBed.runInInjectionContext(() => new TvComponent());
    TestBed.tick();
    await tv.ngOnInit();
  });
  afterEach(() => { tv.ngOnDestroy(); TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('uses only this event and points the QR at guest entry rather than TV', async () => {
    expect(new URL(tv.joinUrl).pathname).toBe('/');
    expect(new URL(tv.joinUrl).searchParams.get('e')).toBe('clausura-lideres-2026');
    fetchTvPhotos.mockResolvedValue([row(2), row(99, 'demo')]);
    await tv.refresh();
    expect(tv.photos().map((p) => p.id)).toEqual([2]);
  });

  it('reconciles live additions and deletions while preserving the list on network errors', async () => {
    fetchTvPhotos.mockResolvedValue([row(2)]);
    notify();
    await vi.advanceTimersByTimeAsync(400);
    expect(tv.photos().map((p) => p.id)).toEqual([2]);
    fetchTvPhotos.mockRejectedValue(new Error('offline'));
    await tv.refresh();
    expect(tv.photos().map((p) => p.id)).toEqual([2]);
    expect(tv.loadError()).toBe(true);
    fetchTvPhotos.mockResolvedValue([row(3)]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(tv.photos().map((p) => p.id)).toEqual([3]);
    expect(tv.loadError()).toBe(false);
  });

  it('queues a refresh if a notification arrives during a snapshot', async () => {
    let resolve!: (rows: Photo[]) => void;
    fetchTvPhotos.mockImplementationOnce(() => new Promise<Photo[]>((r) => { resolve = r; }));
    const pending = tv.refresh();
    notify();
    await vi.advanceTimersByTimeAsync(400);
    resolve([row(2)]);
    await pending;
    fetchTvPhotos.mockResolvedValue([row(3), row(2)]);
    await vi.advanceTimersByTimeAsync(400);
    expect(tv.photos().map((p) => p.id)).toEqual([3, 2]);
  });

  it('clears photos when the event closes and rejects an in-flight open snapshot', async () => {
    let resolve!: (rows: Photo[]) => void;
    fetchTvPhotos.mockImplementationOnce(() => new Promise<Photo[]>((r) => { resolve = r; }));
    const pending = tv.refresh();
    canUpload.set(false);
    TestBed.tick();
    expect(tv.photos()).toEqual([]);
    resolve([row(2)]);
    await pending;
    expect(tv.photos()).toEqual([]);
  });

  it('reports membership failure and releases subscriptions and timers on exit', async () => {
    session.membershipReady = false;
    fetchTvPhotos.mockClear();
    await tv.refresh();
    expect(fetchTvPhotos).not.toHaveBeenCalled();
    expect(tv.loadError()).toBe(true);
    tv.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchTvPhotos).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalled();
  });
});
