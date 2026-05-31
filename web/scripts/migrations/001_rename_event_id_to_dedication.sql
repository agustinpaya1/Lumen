-- 001_rename_event_id_to_dedication.sql
--
-- Rename event_id to dedication — the column stores guest
-- dedication text, not an event identifier (event_key does that).

ALTER TABLE public.photos
  RENAME COLUMN event_id TO dedication;
