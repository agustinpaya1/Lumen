import { Injectable } from '@angular/core';
import { DEFAULT_EVENT_KEY, DEVICE_ID_KEY, EVENT_KEY_STORAGE_KEY } from '@core/constants';

/**
 * Accepted shape of an event key: lowercase alphanumerics and inner hyphens,
 * 3–40 characters. It mirrors the CHECK constraint on `events.key`.
 *
 * Validation is not cosmetic: the key is interpolated into a Realtime
 * `postgres_changes` filter (`event_key=eq.<key>`), where a comma would let a
 * crafted URL append further filter clauses. It also scopes every query, so an
 * unconstrained value is a tenant-selection primitive handed to the caller.
 */
const EVENT_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/**
 * Owns the anonymous, per-browser session identity: a stable device id (used to
 * attribute photo ownership) and the active event key (which scopes every
 * query). Split out of SupabaseService so data access and session state can
 * evolve independently.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private cachedDeviceId: string | null = null;
  private cachedEventKey: string | null = null;

  constructor() {
    this.initEventKey();
  }

  /**
   * The active event key for this session; every query is scoped to it.
   * @returns The resolved event key, or DEFAULT_EVENT_KEY when none is set.
   */
  getStoredEventKey(): string {
    return this.cachedEventKey ?? DEFAULT_EVENT_KEY;
  }

  /**
   * A stable anonymous id for this browser, used for photo-ownership checks.
   * Cached in memory so it returns the SAME value for the whole session.
   * @returns The device id, or a fixed SSR fallback when window is absent.
   */
  getDeviceId(): string {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    // Pure CSR app, but guard SSR/test/edge cases where window or localStorage
    // is absent (or blocked) so construction never throws.
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'ssr-fallback';
    }

    let storedId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedId) {
      storedId = this.generateUuid();
      localStorage.setItem(DEVICE_ID_KEY, storedId);
    }

    this.cachedDeviceId = storedId;
    return storedId;
  }

  /**
   * Resolves the active event key, in priority order, and persists it:
   * 1. URL param `?e=<key>` — persisted so it survives navigation to /home, /camera…
   * 2. localStorage — survives SPA navigation within the same session
   * 3. DEFAULT_EVENT_KEY — public fallback (empty gallery)
   * e.g. `lumen.vercel.app?e=nc2026` selects event `nc2026`.
   */
  private initEventKey(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    const urlEventKey = new URLSearchParams(window.location.search).get('e');
    if (urlEventKey && EVENT_KEY_PATTERN.test(urlEventKey)) {
      localStorage.setItem(EVENT_KEY_STORAGE_KEY, urlEventKey);
      this.cachedEventKey = urlEventKey;
      return;
    }

    // A rejected (or absent) URL key must not clobber a valid stored one.
    const storedKey = localStorage.getItem(EVENT_KEY_STORAGE_KEY);
    this.cachedEventKey =
      storedKey && EVENT_KEY_PATTERN.test(storedKey) ? storedKey : DEFAULT_EVENT_KEY;
  }

  /**
   * RFC4122 v4 UUID. Uses crypto.randomUUID when available and falls back to a
   * Math.random implementation for older mobile browsers that lack it.
   */
  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
