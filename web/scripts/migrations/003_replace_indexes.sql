-- 003_replace_indexes.sql
--
-- The current single-column event_key index is made redundant
-- by the composite index below. Drop it after creating the composite.

-- Composite index for the primary gallery query:
-- WHERE event_key = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_photos_event_key_created_at
  ON public.photos (event_key, created_at DESC);

-- Index for "my photos" query:
-- WHERE device_id = $1 AND event_key = $2 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_photos_device_id_event_key
  ON public.photos (device_id, event_key);

-- Drop the now-redundant single-column event_key index
DROP INDEX IF EXISTS idx_photos_event_key;
