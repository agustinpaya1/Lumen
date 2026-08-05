-- 006_seed_events_from_photos.sql
--
-- events is empty (confirmed via diagnostic) but photos.event_key already
-- references real event keys (e.g. 'nc2026', 77 rows). Seed one row per
-- distinct key so the FK in 007 has something to point at.
--
-- BEFORE RUNNING: check for keys that won't pass the CHECK added in 005:
--   SELECT DISTINCT event_key FROM public.photos
--   WHERE event_key !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$';
-- Any row returned here will make this INSERT fail (or, if you filter it
-- out per the WHERE clause below, will leave orphan photos that break the
-- FK in 007). Resolve those event_key values by hand before proceeding.
--
-- name and event_date are NOT NULL with no real source data available here,
-- so they're seeded with placeholders:
--   name       = event_key   (placeholder — not a real display name)
--   event_date = current_date (placeholder — not the real event date)
--
-- MANUAL FOLLOW-UP: every row inserted by this migration needs `name` and
-- `event_date` corrected by hand afterwards. Find them with:
--   SELECT event_key, name, event_date FROM public.events
--   WHERE name = event_key;   -- placeholder marker, safe as long as no
--                             -- real event is ever named exactly its key

INSERT INTO public.events (event_key, name, event_date)
SELECT DISTINCT p.event_key, p.event_key, current_date
FROM public.photos p
WHERE p.event_key ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.event_key = p.event_key
  );
