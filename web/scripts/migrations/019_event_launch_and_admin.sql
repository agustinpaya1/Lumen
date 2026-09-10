-- Manual event launch, verified-email administrators, and server-side gates.
-- Existing events stay open until the operator explicitly closes one.
BEGIN;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS uploads_open boolean NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS opened_at timestamptz;

CREATE TABLE IF NOT EXISTS public.event_admins (
  event_key text NOT NULL REFERENCES public.events(event_key) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND position('@' in email) > 1),
  PRIMARY KEY (event_key, email)
);
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_admins FROM anon, authenticated;
GRANT ALL ON public.event_admins TO service_role;

CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_admins a
    JOIN auth.users u ON lower(u.email) = a.email
    WHERE a.event_key = p_event_key AND u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS FALSE
  );
$$;
REVOKE ALL ON FUNCTION public.is_event_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_event_admin(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.event_accepts_uploads(p_event_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT uploads_open FROM public.events WHERE event_key = p_event_key), false);
$$;
REVOKE ALL ON FUNCTION public.event_accepts_uploads(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_accepts_uploads(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_event_state(p_event_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('event_key', event_key, 'name', name, 'event_date', event_date,
    'uploads_open', uploads_open, 'opened_at', opened_at)
  FROM public.events WHERE event_key = p_event_key;
$$;
REVOKE ALL ON FUNCTION public.get_event_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_state(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_event_uploads_open(p_event_key text, p_open boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_event_admin(p_event_key) THEN
    RAISE EXCEPTION 'Only the event administrator can open or pause uploads' USING ERRCODE = '42501';
  END IF;
  IF p_open IS NULL THEN RAISE EXCEPTION 'An explicit state is required'; END IF;
  UPDATE public.events SET uploads_open = p_open,
    opened_at = CASE WHEN p_open THEN coalesce(opened_at, now()) ELSE opened_at END
    WHERE event_key = p_event_key;
  RETURN public.get_event_state(p_event_key);
END;
$$;
REVOKE ALL ON FUNCTION public.set_event_uploads_open(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_event_uploads_open(text, boolean) TO authenticated, service_role;

-- The audited events table previously had no RLS policies and broad grants.
-- Updates must go through the guarded RPC, never direct browser writes.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;
GRANT SELECT (event_key, name, event_date, uploads_open, opened_at) ON public.events TO authenticated;
DROP POLICY IF EXISTS events_read_members ON public.events;
CREATE POLICY events_read_members ON public.events FOR SELECT TO authenticated
  USING (event_key IN (SELECT public.get_my_event_keys()) OR public.is_event_admin(event_key));

-- RESTRICTIVE policies also constrain existing permissive guest policies.
DROP POLICY IF EXISTS photos_event_open_insert ON public.photos;
CREATE POLICY photos_event_open_insert ON public.photos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.event_accepts_uploads(event_key));
DROP POLICY IF EXISTS photos_event_open_select ON public.photos;
CREATE POLICY photos_event_open_select ON public.photos AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.event_accepts_uploads(event_key) OR public.is_event_admin(event_key));
DROP POLICY IF EXISTS photos_storage_event_open ON storage.objects;
CREATE POLICY photos_storage_event_open ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'photos' OR public.event_accepts_uploads((storage.foldername(name))[2]));

DROP POLICY IF EXISTS photos_admin_select ON public.photos;
CREATE POLICY photos_admin_select ON public.photos FOR SELECT TO authenticated
  USING (public.is_event_admin(event_key));
DROP POLICY IF EXISTS photos_admin_delete ON public.photos;
CREATE POLICY photos_admin_delete ON public.photos FOR DELETE TO authenticated
  USING (public.is_event_admin(event_key));
DROP POLICY IF EXISTS photos_storage_admin_select ON storage.objects;
CREATE POLICY photos_storage_admin_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND EXISTS (
    SELECT 1 FROM public.photos p WHERE p.url = name AND public.is_event_admin(p.event_key)
  ));
DROP POLICY IF EXISTS photos_storage_admin_delete ON storage.objects;
CREATE POLICY photos_storage_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND EXISTS (
    SELECT 1 FROM public.photos p WHERE p.url = name AND public.is_event_admin(p.event_key)
  ));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;
COMMIT;
