/**
 * A photo row as stored in the Supabase `photos` table.
 *
 * `dedication` holds the guest's optional free-text dedication;
 * `event_key` is the value that scopes a photo to a given event.
 */
export interface Photo {
  id: number;
  url: string;
  /** Free-text dedication written by the guest (optional). */
  dedication: string | null;
  device_id: string;
  event_key: string;
  created_at: string;
}

/** A {@link Photo} enriched with its resolved public storage URL for display. */
export interface GalleryPhoto extends Photo {
  publicUrl: string;
}
