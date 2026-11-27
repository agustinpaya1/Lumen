-- Give authorized event admins access to presentation fields only.
BEGIN;

GRANT UPDATE (name, event_date, banner_url, photo_limit, theme)
  ON public.events TO authenticated;

DROP POLICY IF EXISTS events_update_admin_settings ON public.events;
CREATE POLICY events_update_admin_settings ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_event_admin(event_key))
  WITH CHECK (public.is_event_admin(event_key));

ALTER TABLE public.events
  ADD CONSTRAINT events_theme_object_check CHECK (
    jsonb_typeof(theme) = 'object' AND octet_length(theme::text) <= 32768
  );

COMMIT;
