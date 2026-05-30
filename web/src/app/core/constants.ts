/**
 * Application-wide constants — the single source of truth for values that are
 * referenced in more than one place. Keep literals here so behaviour-defining
 * values (storage keys, retry timing, limits) can be changed in exactly one spot.
 */

// --- Persistence keys (localStorage / sessionStorage) ---
export const DEVICE_ID_KEY = 'lumen_device_id';
export const EVENT_KEY_STORAGE_KEY = 'lumen_event_key';
export const PHOTOS_REMAINING_KEY = 'lumen_photos_remaining';
export const ADMIN_AUTH_KEY = 'lumen_admin_auth';
// Pre-existing key without the `lumen_` prefix — kept as-is so returning users
// who already completed onboarding are still recognised.
export const TUTORIAL_SEEN_KEY = 'hasSeenTutorial';

// --- Photo limit ---
export const DEFAULT_PHOTO_LIMIT = 10;

// --- Upload retry (exponential backoff) ---
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BACKOFF_DELAYS_MS = [1000, 2000, 4000];

// --- Supabase storage & realtime ---
export const PHOTOS_BUCKET = 'photos';
export const PHOTOS_TABLE = 'photos';
export const DEFAULT_EVENT_KEY = 'demo';
export const ADMIN_PHOTOS_CHANNEL = 'photos_realtime';
export const HOME_PHOTOS_CHANNEL = 'home:photos';
export const SIGNED_URL_TTL_SECONDS = 60;
