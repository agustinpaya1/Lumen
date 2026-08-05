import { inject, Injectable } from '@angular/core';
import { DEFAULT_EVENT_KEY, DEVICE_ID_KEY, EVENT_KEY_STORAGE_KEY, EVENT_MEMBERS_TABLE } from '@core/constants';
import { LoggerService } from './logger.service';
import { SupabaseClientService } from './supabase-client.service';

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
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  private cachedDeviceId: string | null = null;
  private cachedEventKey: string | null = null;
  private cachedUserId: string | null = null;

  /**
   * Whether the membership upsert into `event_members` succeeded for this
   * session. When false the RLS policies will block SELECT/INSERT on `photos`,
   * so the gallery will appear empty — but the app will not crash.
   */
  private _membershipReady = false;
  get membershipReady(): boolean { return this._membershipReady; }

  constructor() {
    this.initEventKey();
  }

  /**
   * Ensures an anonymous Supabase Auth session exists for this browser,
   * restoring a previously persisted one instead of minting a new user on
   * every visit (the SDK persists sessions to localStorage and restores them
   * automatically). Called once from an APP_INITIALIZER at bootstrap so
   * `auth.uid()` is available before any guest-facing action needs it.
   */
  async ensureAuthSession(): Promise<void> {
    const { data: { session } } = await this.supabaseClient.client.auth.getSession();

    if (session?.user) {
      this.cachedUserId = session.user.id;
    } else {
      const { data, error } = await this.supabaseClient.client.auth.signInAnonymously();
      if (error) {
        throw error;
      }
      this.cachedUserId = data.user?.id ?? null;
    }

    // With the auth session ready, register this user as a member of the
    // active event so the RLS policies on `photos` grant access.
    await this.ensureMembership();
  }

  /**
   * The signed-in Supabase user id (`auth.uid()`) for this guest's anonymous
   * session, or null if `ensureAuthSession()` hasn't resolved yet.
   */
  getUserId(): string | null {
    return this.cachedUserId;
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
   * Upserts a row in `event_members` linking the current `auth.uid()` to the
   * active event key. This is required by the RLS policies on `photos`:
   * without a matching membership row, every SELECT / INSERT will be rejected.
   *
   * The upsert uses `onConflict: 'user_id,event_key'` so revisiting the same
   * event (or a page reload) is a no-op rather than a constraint violation.
   *
   * Errors are caught and logged — the app stays functional but the gallery
   * will appear empty (RLS blocks access) until the user retries.
   */
  private async ensureMembership(): Promise<void> {
    const userId = this.cachedUserId;
    const eventKey = this.getStoredEventKey();

    if (!userId) {
      this.logger.warn('ensureMembership skipped: no authenticated user id.');
      return;
    }

    try {
      const { error } = await this.supabaseClient.client
        .from(EVENT_MEMBERS_TABLE)
        .upsert(
          { user_id: userId, event_key: eventKey },
          { onConflict: 'user_id,event_key' }
        );

      if (error) {
        this.logger.error('event_members upsert failed:', error);
        return;
      }

      this._membershipReady = true;
    } catch (err) {
      // Network / unexpected failure — fail open so the app still loads.
      this.logger.error('event_members upsert threw:', err);
    }
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
