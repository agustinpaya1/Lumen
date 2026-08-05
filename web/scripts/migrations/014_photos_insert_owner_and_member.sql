-- 014_photos_insert_owner_and_member.sql
--
-- Replaces photos_insert_public (004: WITH CHECK (true) — anyone with the
-- anon key could write a row into any event, attributed to anyone). Two
-- conditions now have to hold at once: the row is attributed to the caller,
-- and the caller belongs to the event they are writing into.
--
-- DROP and CREATE in one transaction, same reasoning as 013 — no window
-- where uploads are rejected mid-event.
--
-- Apply AFTER 012 (the membership check depends on guests being able to join).

BEGIN;

DROP POLICY IF EXISTS "photos_insert_public" ON public.photos;

CREATE POLICY "photos_insert_own_in_my_events"
  ON public.photos FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The uploader cannot attribute a photo to another user, and cannot
    -- leave it unattributed: owner_id IS NULL makes this comparison NULL,
    -- which is not TRUE, which fails the check. Every row written from here
    -- on carries a real owner — which is what makes the DELETE policy in 015
    -- mean something.
    owner_id = auth.uid()
    -- And cannot write into an event they never joined. Without this, knowing
    -- any event key would be enough to inject photos into someone else's
    -- gallery without ever appearing in event_members.
    AND event_key IN (SELECT public.get_my_event_keys())
  );

COMMIT;


-- HOW owner_id GETS POPULATED
--
-- 009 declared owner_id with DEFAULT auth.uid(), and savePhotoData() in
-- supabase.service.ts does not send the column at all — so PostgREST omits it
-- and the default fills it in. The check passes today without any client
-- change. That is a fragile coincidence rather than a design: the moment the
-- client sends owner_id explicitly as null (an unresolved session, a mapped
-- object with the key present), PostgREST writes NULL, the DEFAULT does not
-- apply, and the insert fails with a policy violation instead of a readable
-- error. Setting owner_id explicitly client-side, and refusing to attempt the
-- upload when auth.uid() is unknown, is the honest version.
--
-- Note this policy makes owner_id effectively NOT NULL for new rows without
-- declaring the constraint. An actual NOT NULL would need the historical rows
-- backfilled first (see 015) — deliberately not done here.
--
-- No UPDATE policy is added, consistent with 004: the app never updates a
-- photo row, and the missing policy is what stops anyone from re-attributing
-- an existing photo to themselves.


-- Verification:
--
--   SELECT policyname, cmd, roles, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'photos' AND cmd = 'INSERT';
--
-- Expect exactly one row. Any leftover permissive INSERT policy is OR'd with
-- this one and re-opens the table.
