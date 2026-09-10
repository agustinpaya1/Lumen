import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { EventService } from './event.service';
import { SupabaseClientService } from './supabase-client.service';
import { SessionService } from './session.service';

describe('EventService launch and offline state', () => {
  const key = 'test-launch';
  const state = (open: boolean) => ({
    event_key: key,
    name: 'Test',
    event_date: '2026-09-12',
    uploads_open: open,
    opened_at: null,
  });
  let result: { data: unknown; error: unknown };
  const rpc = vi.fn();
  let update: () => void;
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    result = { data: state(true), error: null };
    rpc.mockReset().mockImplementation(() => ({ abortSignal: () => Promise.resolve(result) }));
    const channel = {
      on: vi.fn((_type, _options, callback) => {
        update = callback;
        return channel;
      }),
      subscribe: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: { getStoredEventKey: () => key } },
        {
          provide: SupabaseClientService,
          useValue: { client: { rpc, channel: () => channel, removeChannel: vi.fn() } },
        },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it('fails closed without previously loaded event information', () => {
    expect(TestBed.inject(EventService).canUpload()).toBe(false);
  });
  it('loads an open event and caches its state', async () => {
    const event = TestBed.inject(EventService);
    await event.refresh();
    expect(event.canUpload()).toBe(true);
    expect(JSON.parse(localStorage.getItem('lumen:event:' + key)!)).toEqual(state(true));
  });
  it('keeps previously opened events usable for offline captures', async () => {
    localStorage.setItem('lumen:event:' + key, JSON.stringify(state(true)));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const event = TestBed.inject(EventService);
    await event.refresh();
    expect(event.canUpload()).toBe(true);
    expect(event.error()).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not mistake a network failure for permission to open a waiting event', async () => {
    localStorage.setItem('lumen:event:' + key, JSON.stringify(state(false)));
    result = { data: null, error: new Error('Network') };
    const event = TestBed.inject(EventService);
    await event.refresh();
    expect(event.waiting()).toBe(true);
    expect(event.canUpload()).toBe(false);
  });
  it('clears a cached event when the server confirms it no longer exists', async () => {
    localStorage.setItem('lumen:event:' + key, JSON.stringify(state(true)));
    result = { data: null, error: null };
    const event = TestBed.inject(EventService);
    await event.refresh();
    expect(event.canUpload()).toBe(false);
    expect(localStorage.getItem('lumen:event:' + key)).toBeNull();
  });
  it('ignores a cache record belonging to another event', () => {
    localStorage.setItem(
      'lumen:event:' + key,
      JSON.stringify({ ...state(true), event_key: 'other' }),
    );
    expect(TestBed.inject(EventService).state()).toBeNull();
  });
  it('refreshes launch state on realtime notifications', async () => {
    result = { data: state(false), error: null };
    const event = TestBed.inject(EventService);
    await event.initialize();
    expect(event.waiting()).toBe(true);
    result = { data: state(true), error: null };
    update();
    await event.refresh();
    expect(event.canUpload()).toBe(true);
  });
});
