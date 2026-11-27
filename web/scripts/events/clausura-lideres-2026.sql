-- Created and verified in Lumen-backend on 2026-11-27.
-- Independent album; the host will upload the course photos through the app.
-- Safe to repeat: never replaces an existing event's configuration or photos.
INSERT INTO public.events (event_key, name, event_date, photo_limit, uploads_open)
VALUES ('clausura-lideres-2026', 'Clausura de Líderes', DATE '2026-12-03', 10, true)
ON CONFLICT (event_key) DO NOTHING;

SELECT public.get_event_state('clausura-lideres-2026');
