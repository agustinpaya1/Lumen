-- 015_photos_delete_owner_only.sql
--
-- Replaces photos_delete_public (004: USING (true), with the TODO(auth) note
-- saying exactly this). Deleting a photo now requires owning it. The
-- device_id check in home.ts (isMyPhoto) stops being the only thing standing
-- between a guest and everyone else's photos, and becomes what it was always
-- described as: UI gating on top of a real rule.
--
-- DROP and CREATE in one transaction, same reasoning as 013.

BEGIN;

DROP POLICY IF EXISTS "photos_delete_public" ON public.photos;

CREATE POLICY "photos_delete_own"
  ON public.photos FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

COMMIT;


-- HISTORICAL ROWS WITH owner_id IS NULL — READ THIS BEFORE APPLYING
--
-- Every photo written before 009/014 has owner_id IS NULL. For those rows the
-- policy evaluates NULL = auth.uid(), which is NULL, which is not TRUE — so
-- the row is invisible to DELETE for every authenticated user without
-- exception. Not "hard to delete": impossible through the client, for anyone,
-- including the person who originally took the photo.
--
-- Removing them requires a connection that bypasses RLS — the Supabase
-- dashboard SQL editor, or a service_role key from a trusted server. Note
-- that the /admin page is NOT that: it authenticates with a client-side PIN
-- (admin.ts) over the same anon key and the same anonymous user as any guest,
-- so after this migration its delete button fails with a policy violation on
-- every photo it did not itself upload. "Only the admin can delete them"
-- means the operator with dashboard access — not the /admin screen.
--
-- Count what this affects before applying:
--
--   SELECT event_key, count(*) FROM public.photos
--   WHERE owner_id IS NULL GROUP BY event_key ORDER BY 2 DESC;
--
-- Three ways to go, pick one deliberately:
--
--   (a) Accept it. Historical photos become operator-deletable only. Correct
--       if those rows are demo/seed data or belong to finished events. This
--       is what the migration as written does.
--
--   (b) Backfill from device_id, if and only if a device_id can be mapped to
--       an auth user — it cannot today; nothing records that association. Not
--       available without new schema.
--
--   (c) Delete the orphans outright, if they are demo data. Separate,
--       explicit statement — not folded into this migration, and it would
--       also need the storage objects removed (next task).
--
-- No exemption for NULL owner_id is written into the policy on purpose:
-- "OR owner_id IS NULL" would let any authenticated user delete every
-- historical photo in any event they can see, which is strictly worse than
-- the state this migration is fixing.


-- Verification:
--
--   SELECT policyname, cmd, roles, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'photos' AND cmd = 'DELETE';
--
-- Expect exactly one row, and confirm the full policy set on the table is
-- now: photos_select_members, photos_insert_own_in_my_events,
-- photos_delete_own — and nothing else.
--
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'photos' ORDER BY cmd;
