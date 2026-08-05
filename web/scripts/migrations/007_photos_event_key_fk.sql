-- 007_photos_event_key_fk.sql
--
-- Tie photos.event_key to events.event_key now that every existing key is
-- represented (006). ON DELETE RESTRICT: an event with photos must not be
-- deletable by accident — deleting an event's photos is a separate,
-- deliberate operation, not a side effect of removing the event row.
--
-- This will fail if 006 didn't seed every distinct photos.event_key value
-- (e.g. a key that didn't match the format CHECK). Re-run the pre-check
-- query from 006 if this errors.

ALTER TABLE public.photos
  ADD CONSTRAINT photos_event_key_fkey
  FOREIGN KEY (event_key) REFERENCES public.events(event_key)
  ON DELETE RESTRICT;
