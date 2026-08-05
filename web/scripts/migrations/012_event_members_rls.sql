-- 012_event_members_rls.sql
--
-- RLS for event_members. Migration 008 created this table but never enabled
-- row level security, and Supabase grants SELECT/INSERT/UPDATE/DELETE on new
-- public-schema tables to `anon` and `authenticated` by default. Until this
-- migration runs, the membership table is world-readable and world-writable
-- with nothing but the anon key: anyone can list every (user_id, event_key)
-- pair in the deployment, insert themselves into any event, or delete other
-- people's memberships. ENABLE ROW LEVEL SECURITY below is the load-bearing
-- statement; the policies are what make the table usable again afterwards.
--
-- Apply this BEFORE 013. From 013 onwards a guest can only read photos for
-- events they are a member of, so the ability to become a member has to
-- exist first or the gallery goes dark for everyone in between.

BEGIN;

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Explicit grants. Supabase's default privileges on the public schema should
-- already have granted these when 008 created the table, but they are stated
-- here so the file is self-contained and correct on a fresh database. RLS is
-- what restricts the rows; these only open the table to the role at all.
GRANT SELECT, INSERT ON public.event_members TO authenticated;


-- ---------------------------------------------------------------------------
-- SELECT: your own memberships, nobody else's.
-- ---------------------------------------------------------------------------
-- Consequence worth being aware of: "who else is at this event" becomes
-- unanswerable from the client. That is deliberate — a guest list is personal
-- data and the app has no feature that needs it.
--
-- This policy is NOT what the photos policies in 013/014 consult. Those go
-- through get_my_event_keys(), which is SECURITY DEFINER and therefore
-- bypasses this policy entirely (see the reasoning in 008). Tightening the
-- SELECT policy here cannot break the photos policies.

CREATE POLICY "event_members_select_own"
  ON public.event_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- INSERT: joining an event. This is the policy the whole design turns on.
-- ---------------------------------------------------------------------------
-- What can be checked here, and what cannot:
--
--   user_id = auth.uid()   Enforced below. A membership row can only ever
--                          name its own creator. Nobody can add a third party
--                          to an event, and nobody can forge memberships on
--                          another user's behalf. This also means the table
--                          cannot be used to write arbitrary rows keyed by
--                          someone else's uuid.
--
--   the event exists       Already enforced, by the foreign key from 008
--                          (event_key -> events.event_key). Joining a key
--                          that was never provisioned fails at the
--                          constraint, before the policy is even relevant.
--                          A caller cannot mint membership in an invented
--                          event, so this is not a way to probe for anything
--                          beyond "does this exact key exist" — which is the
--                          same thing the join itself reveals.
--
--   the caller was         NOT enforceable at this layer. The only evidence
--   actually invited       the legitimate guest carries is the event key
--                          itself, read from the QR code. There is no second
--                          factor anywhere in the request for the database to
--                          test against, so any check stricter than "you know
--                          the key" would also reject the real guest standing
--                          in the venue with their phone.
--
-- Stated plainly, because it belongs in the write-up in these words:
-- after this migration, membership in an event means possession of that
-- event's key. Nothing more.
--
-- What that DOES buy, compared to the previous state:
--   - Enforcement moves from the client to the server. Before, the event_key
--     filter lived only in the Angular queries; anyone with the anon key and
--     a REST client read every photo in every event. Now the database refuses.
--   - Memberships are per-user and non-forgeable. You cannot enrol anyone
--     else, and you cannot read anyone else's memberships.
--   - The blast radius of a leaked key is one event, not the whole table.
--
-- What it does NOT buy, and must not be claimed:
--   - It is not proof of invitation. Anyone who learns a valid event key —
--     a photo of the QR, a shared link, a forwarded screenshot, or simply
--     guessing — can join that event and read its photos. The isolation is
--     exactly as strong as the key is unguessable, and the keys in production
--     today ('nc2026', 'boda-lucia') are short, human-readable and guessable.
--     Access control here is authorisation by shared secret, and the secret
--     is currently a weak one.
--   - Removing the guest afterwards is not possible from the client (no
--     DELETE policy, by design), so a wrongly-granted membership is permanent
--     until an operator removes it.
--
-- The upgrade that would actually break the "the key is the secret" property
-- is out of scope for this migration because it needs schema, client and QR
-- changes: give events a separate high-entropy join token, put it in the QR
-- alongside the key, and move joining into a SECURITY DEFINER
-- join_event(key, token) function — at which point this policy becomes
-- WITH CHECK (false) and the client cannot insert directly at all. Recorded
-- here as the known ceiling, not scheduled.

CREATE POLICY "event_members_insert_self"
  ON public.event_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- Optional hardening, NOT enabled. Restricting joins to a window around
-- events.event_date would shrink the useful lifetime of a leaked key from
-- forever to a few days, at the cost of rejecting genuine late joiners (the
-- guest who scans the QR a week later to see the photos). It also cannot be
-- written as a plain subquery on public.events: that subquery runs under
-- events' own RLS, so if RLS is ever enabled there with no matching policy,
-- every join silently fails. It would need its own SECURITY DEFINER helper,
-- for the same reason get_my_event_keys() exists (see 008). Left as a
-- deliberate no for now — the friction is real and the benefit is partial.
--
--   AND (SELECT public.event_is_joinable(event_key))


-- No UPDATE policy: a membership row has nothing to change — both of its
-- columns are the primary key.
--
-- No DELETE policy: leaving an event is not a feature the app has, and a
-- client-side DELETE would only ever be used to hide a membership. Removing
-- someone is an operator action through the Supabase dashboard.

COMMIT;


-- Verification (run separately, as the authenticated guest and not as
-- postgres — the table owner bypasses RLS and will see everything):
--
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'event_members';
--
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid = 'public.event_members'::regclass;   -- must be true
