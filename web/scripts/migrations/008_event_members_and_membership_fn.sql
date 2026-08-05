-- 008_event_members_and_membership_fn.sql
--
-- event_members: which authenticated users belong to which event, for the
-- upcoming RLS policies on photos (not part of this migration).
--
-- get_my_event_keys(): a SECURITY DEFINER function that reads
-- event_members on behalf of the caller. A policy on event_members itself
-- that does "USING (user_id = auth.uid())" is fine, but a policy on
-- ANOTHER table (e.g. photos) that subqueries event_members directly runs
-- that subquery under RLS too — which is fine here since it's a simple
-- self-check, but the moment event_members' own SELECT policy needs to
-- consult event_members (e.g. "see rows for events you're also a member
-- of"), that becomes infinite recursion. Routing through a SECURITY
-- DEFINER function sidesteps RLS entirely for this one read, breaking the
-- cycle before it can start.

CREATE TABLE public.event_members (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key  text NOT NULL REFERENCES public.events(event_key) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_key)
);

-- PK (user_id, event_key) already serves "which events is this user in".
-- This serves the reverse: "who is in this event".
CREATE INDEX idx_event_members_event_key
  ON public.event_members (event_key);

CREATE OR REPLACE FUNCTION public.get_my_event_keys()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT event_key
  FROM public.event_members
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_event_keys() TO authenticated;
