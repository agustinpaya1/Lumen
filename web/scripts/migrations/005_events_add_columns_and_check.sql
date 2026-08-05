-- 005_events_add_columns_and_check.sql
--
-- Extend public.events with the columns the app needs (branding, per-event
-- photo quota, creator attribution) and enforce the key format in the
-- database, not just in SessionService.
--
-- Diagnostic confirmed: events already has PRIMARY KEY (event_key)
-- (events_pkey) and 0 rows, so there is no duplicate-key risk. The PK step
-- below is a no-op guard, kept only in case this runs against an
-- environment where the PK was never added.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.events ADD PRIMARY KEY (event_key);
  END IF;
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS photo_limit int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Mirrors EVENT_KEY_PATTERN in session.service.ts: lowercase alphanumerics
-- and inner hyphens, 3-40 chars. The key is interpolated into a Realtime
-- filter client-side, so the app already trusts this shape — this makes
-- the trust boundary real instead of advisory.
ALTER TABLE public.events
  ADD CONSTRAINT events_event_key_format_check
  CHECK (event_key ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');
