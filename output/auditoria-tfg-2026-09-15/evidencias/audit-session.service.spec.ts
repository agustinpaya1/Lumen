import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggerService } from './logger.service';
import { SessionService } from './session.service';
import { SupabaseClientService } from './supabase-client.service';

describe('SessionService operational failures', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), critical: vi.fn() };
  const getSession = vi.fn();
  const signInAnonymously = vi.fn();
  const upsert = vi.fn();

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'private-user' } }, error: null });
    upsert.mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: logger },
        { provide: SupabaseClientService, useValue: { client: {
          auth: { getSession, signInAnonymously },
          from: () => ({ upsert }),
        } } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('reports an online authentication failure as critical and preserves the rejection', async () => {
    const error = new Error('Anonymous sign-ins are disabled');
    signInAnonymously.mockResolvedValue({ data: { user: null }, error });

    await expect(TestBed.inject(SessionService).ensureAuthSession()).rejects.toBe(error);
    expect(logger.critical).toHaveBeenCalledExactlyOnceWith('Anonymous authentication unavailable', error);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('keeps offline authentication failure at warning level', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const error = new Error('Failed to fetch');
    getSession.mockRejectedValue(error);

    await expect(TestBed.inject(SessionService).ensureAuthSession()).rejects.toBe(error);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Anonymous authentication unavailable', error);
    expect(logger.critical).not.toHaveBeenCalled();
  });

  it('reports failed membership as critical and logs readiness once after recovery', async () => {
    const error = { code: '42501', message: 'Permission denied' };
    upsert.mockResolvedValueOnce({ error });
    const session = TestBed.inject(SessionService);

    await session.ensureAuthSession();
    expect(session.membershipReady).toBe(false);
    expect(logger.critical).toHaveBeenCalledExactlyOnceWith('Event membership registration failed', error);

    await session.ensureAuthSession();
    await session.ensureAuthSession();
    expect(session.membershipReady).toBe(true);
    expect(logger.info).toHaveBeenCalledExactlyOnceWith('Authentication and event membership ready');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('private-user');
  });
  it('AUDIT device identity restores in a second instance and changes after storage clear', () => {
    const first = TestBed.inject(SessionService);
    const id = first.getDeviceId();
    const second = TestBed.runInInjectionContext(() => new SessionService());
    expect(second.getDeviceId()).toBe(id);
    localStorage.clear();
    expect(first.getDeviceId()).toBe(id);
    const third = TestBed.runInInjectionContext(() => new SessionService());
    expect(third.getDeviceId()).not.toBe(id);
  });
  it('AUDIT event cache stays in the first instance when another instance selects an event', () => {
    localStorage.setItem('lumen_event_key', 'audit-one');
    const first = TestBed.runInInjectionContext(() => new SessionService());
    localStorage.setItem('lumen_event_key', 'audit-two');
    const second = TestBed.runInInjectionContext(() => new SessionService());
    expect(first.getStoredEventKey()).toBe('audit-one');
    expect(second.getStoredEventKey()).toBe('audit-two');
  });
  it('AUDIT existing auth user is reused and joins with ignoreDuplicates', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'audit-user' } } }, error: null });
    const session = TestBed.inject(SessionService);
    await session.ensureAuthSession();
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(session.getUserId()).toBe('audit-user');
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'audit-user', event_key: session.getStoredEventKey() },
      { onConflict: 'user_id,event_key', ignoreDuplicates: true });
  });

});
