-- 013_photos_select_members_only.sql
--
-- Replaces photos_select_public (004: USING (true) — every photo in every
-- event readable by anyone holding the anon key) with membership-scoped
-- reads. The event_key filter that used to live only in the Angular queries
-- becomes an actual boundary.
--
-- DROP and CREATE run in one transaction so there is no instant where the
-- table has no SELECT policy at all. That window would not be a data leak —
-- with RLS on and no policy, reads return nothing — but it would black out
-- the live gallery for every connected guest for the duration, and this is
-- meant to be applied against a running event.
--
-- Note: the Supabase SQL editor already wraps a script in a transaction, so
-- the explicit BEGIN may log "there is already a transaction in progress".
-- That warning is harmless; the BEGIN/COMMIT stays so the file is also
-- correct when run through psql.
--
-- Apply AFTER 012. Guests need to be able to join before membership is what
-- gates reading.

BEGIN;

-- Defensive and idempotent: policies on photos imply RLS is already on, but
-- an un-enabled RLS flag would make every policy below decorative.
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_select_public" ON public.photos;

-- TO authenticated, not public. Guests are authenticated: SessionService
-- calls signInAnonymously() from the APP_INITIALIZER, so an ordinary visitor
-- has a real auth.uid() before anything queries. The role narrowing is what
-- removes `anon` — a bare anon-key REST call now reads nothing.
--
-- get_my_event_keys() is SECURITY DEFINER and STABLE (008): it reads
-- event_members outside RLS, which both avoids recursion and lets the planner
-- evaluate it once per statement rather than once per row.
CREATE POLICY "photos_select_members"
  ON public.photos FOR SELECT
  TO authenticated
  USING (event_key IN (SELECT public.get_my_event_keys()));

COMMIT;


-- CONSEQUENCES TO EXPECT AFTER THIS RUNS
--
-- 1. A guest whose anonymous sign-in failed sees an empty gallery instead of
--    an error. app.config.ts deliberately fails open on ensureAuthSession()
--    so a broken sign-in never blocks the app; the cost is that such a
--    visitor is `anon`, matches no policy, and reads zero rows. Empty gallery,
--    no error message. This is the new normal failure mode and it is silent.
--
-- 2. A guest who is authenticated but has not joined the event also sees an
--    empty gallery. The client has to insert into event_members when it
--    resolves the event key, or nobody sees anything.
--
-- 3. The /admin dashboard reads through the same anon key and the same
--    anonymous user (the PIN is client-side only, admin.ts). fetchPhotos()
--    now returns only photos from events that particular anonymous browser
--    session has joined. There is no admin role in the database to exempt.
--
-- 4. Realtime postgres_changes on photos is subject to the same policy.
--    Verify the live gallery still receives INSERT/DELETE events after
--    applying — the channel must be created with the authenticated JWT, which
--    it is here only because ensureAuthSession() runs at bootstrap, before
--    any component subscribes.


-- Verification (as the guest, not as postgres):
--
--   SELECT policyname, cmd, roles, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'photos' AND cmd = 'SELECT';
--
-- Expect exactly one row. Any other permissive SELECT policy left over on
-- this table would be OR'd with the one above and would undo it:
--
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'photos';
