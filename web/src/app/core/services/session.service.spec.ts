import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EVENT_KEY, DEVICE_ID_KEY, EVENT_KEY_STORAGE_KEY } from '@core/constants';
import { SessionService } from './session.service';

/** RFC4122 v4 shape — version nibble 4, variant nibble 8/9/a/b. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const originalSearch = window.location.search;

/**
 * The event key is resolved in the constructor from `window.location.search`,
 * so the URL has to be set BEFORE injection. Every test goes through this.
 */
function injectWithUrl(search: string): SessionService {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
  TestBed.configureTestingModule({});
  return TestBed.inject(SessionService);
}

describe('SessionService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
      configurable: true,
    });
  });

  describe('event key resolution', () => {
    it('reads the event key from the ?e= URL parameter', () => {
      expect(injectWithUrl('?e=nc2026').getStoredEventKey()).toBe('nc2026');
    });

    it('persists the URL event key so it survives SPA navigation', () => {
      injectWithUrl('?e=nc2026');
      expect(localStorage.getItem(EVENT_KEY_STORAGE_KEY)).toBe('nc2026');
    });

    it('falls back to localStorage when no URL parameter is present', () => {
      localStorage.setItem(EVENT_KEY_STORAGE_KEY, 'boda-lucia');
      expect(injectWithUrl('').getStoredEventKey()).toBe('boda-lucia');
    });

    it('falls back to the default event when nothing is set anywhere', () => {
      expect(injectWithUrl('').getStoredEventKey()).toBe(DEFAULT_EVENT_KEY);
    });

    it('gives the URL parameter precedence over a different stored key', () => {
      // The QR code is authoritative: scanning a new event must switch tenants,
      // not keep serving the previously visited one.
      localStorage.setItem(EVENT_KEY_STORAGE_KEY, 'evento-viejo');
      const service = injectWithUrl('?e=evento-nuevo');

      expect(service.getStoredEventKey()).toBe('evento-nuevo');
      expect(localStorage.getItem(EVENT_KEY_STORAGE_KEY)).toBe('evento-nuevo');
    });

    it('ignores an empty ?e= and keeps the stored key', () => {
      localStorage.setItem(EVENT_KEY_STORAGE_KEY, 'boda-lucia');
      const service = injectWithUrl('?e=');

      expect(service.getStoredEventKey()).toBe('boda-lucia');
      expect(localStorage.getItem(EVENT_KEY_STORAGE_KEY)).toBe('boda-lucia');
    });

    it('rejects a malformed event key instead of persisting it', () => {
      // The key is interpolated into a Realtime filter and scopes every query,
      // so only the documented charset is accepted.
      localStorage.setItem(EVENT_KEY_STORAGE_KEY, 'boda-lucia');
      const service = injectWithUrl('?e=' + encodeURIComponent('../../etc/passwd'));

      expect(service.getStoredEventKey()).toBe('boda-lucia');
      expect(localStorage.getItem(EVENT_KEY_STORAGE_KEY)).toBe('boda-lucia');
    });

    it('rejects an event key containing a Realtime filter separator', () => {
      const service = injectWithUrl('?e=demo,event_key=neq.demo');
      expect(service.getStoredEventKey()).toBe(DEFAULT_EVENT_KEY);
    });
  });

  describe('device id', () => {
    it('generates and persists a device id on first use', () => {
      const deviceId = injectWithUrl('').getDeviceId();

      expect(deviceId).toMatch(UUID_V4);
      expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(deviceId);
    });

    it('reuses the persisted device id across sessions', () => {
      localStorage.setItem(DEVICE_ID_KEY, 'ffffffff-ffff-4fff-8fff-ffffffffffff');
      expect(injectWithUrl('').getDeviceId()).toBe(
        'ffffffff-ffff-4fff-8fff-ffffffffffff'
      );
    });

    it('returns a stable value within a session', () => {
      const service = injectWithUrl('');
      expect(service.getDeviceId()).toBe(service.getDeviceId());
    });

    it('falls back to a Math.random UUID when crypto.randomUUID is missing', () => {
      // Older mobile browsers and non-secure contexts do not expose randomUUID
      // at all, so the absence has to be simulated by removing the property.
      const original = crypto.randomUUID;
      Object.defineProperty(crypto, 'randomUUID', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      try {
        const deviceId = injectWithUrl('').getDeviceId();
        expect(deviceId).toMatch(UUID_V4);
        expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(deviceId);
      } finally {
        Object.defineProperty(crypto, 'randomUUID', {
          value: original,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});
