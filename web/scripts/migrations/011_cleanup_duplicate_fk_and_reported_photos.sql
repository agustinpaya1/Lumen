-- 011_cleanup_duplicate_fk_and_reported_photos.sql
--
-- fk_photo_event: a second FK on photos.event_key -> events.event_key,
-- found via diagnostic, not created by any migration in this series.
-- Redundant with photos_event_key_fkey (007) and left NOT VALID, so it
-- adds no integrity guarantee the other constraint doesn't already give.
-- Confirmed with the user before dropping — origin unknown, no other
-- purpose identified.
--
-- reported_photos: 010 attempted this DROP but it didn't take effect
-- (table still present per diagnostic). Re-issuing it here.

ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS fk_photo_event;

DROP TABLE IF EXISTS public.reported_photos;
