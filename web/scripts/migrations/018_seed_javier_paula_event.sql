-- 018_seed_javier_paula_event.sql
-- Provision the event selected by the QR parameter:
--   ?e=jp-reboda-2026-k7m4q9x2

BEGIN;

INSERT INTO public.events (
  event_key,
  name,
  event_date,
  brand_color,
  banner_url,
  photo_limit
)
VALUES (
  'jp-reboda-2026-k7m4q9x2',
  'Javier y Paula — Reboda',
  DATE '2026-09-12',
  '#9d4f3c',
  NULL,
  10
)
ON CONFLICT (event_key) DO UPDATE
SET
  name = EXCLUDED.name,
  event_date = EXCLUDED.event_date,
  brand_color = EXCLUDED.brand_color,
  banner_url = EXCLUDED.banner_url,
  photo_limit = EXCLUDED.photo_limit;

COMMIT;
