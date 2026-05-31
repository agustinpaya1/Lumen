-- demo_seed.sql
-- Seed data for Lumen's guided demo mode (event_key = 'demo').
--
-- Demo mode is the public fallback that runs when a visitor opens the app
-- WITHOUT an ?e=<event> parameter (recruiters, evaluators, the TFG defense).
-- These rows give that empty gallery something realistic to show.
--
-- PREREQUISITE — upload the placeholder images first
-- --------------------------------------------------
-- The `url` column holds a STORAGE PATH inside the public `photos` bucket
-- (same convention the camera uses: `uploads/photo_<ts>.jpg`). The app resolves
-- it with `getPublicUrl(url)`, so each path below must point at a real object in
-- the bucket or the thumbnail will 404.
--
-- Before running this script, upload 7 images to the `photos` bucket under the
-- `demo/` folder, named lumen-01.jpg … lumen-07.jpg. Any ~800x600 JPEGs work;
-- quick placeholders can be downloaded from picsum, e.g.
--   curl -L "https://picsum.photos/seed/lumen1/800/600" -o lumen-01.jpg
--   curl -L "https://picsum.photos/seed/lumen2/800/600" -o lumen-02.jpg   ... etc.
-- then drag them into Storage → photos → demo/ in the Supabase dashboard.
--
-- Re-runnable: the DELETE below only removes previously seeded rows (identified
-- by the `demo-seed-` device_id prefix), so real photos captured by demo-mode
-- visitors are left untouched.

begin;

delete from public.photos
where event_key = 'demo'
  and device_id like 'demo-seed-%';

-- id and created_at are normally DB-managed; created_at is set explicitly here
-- so the gallery (ordered by created_at desc) shows a believable event timeline.
-- `event_id` is the legacy column name that actually stores the guest dedication.
insert into public.photos (url, event_id, device_id, event_key, created_at) values
  ('demo/lumen-01.jpg', 'Qué noche tan mágica. ¡Felicidades Natacha y Lucas! 🥂',          'demo-seed-ana',    'demo', '2026-05-30T23:42:00+02:00'),
  ('demo/lumen-02.jpg', 'El primer baile como marido y mujer 💃🕺',                          'demo-seed-carlos', 'demo', '2026-05-30T23:15:00+02:00'),
  ('demo/lumen-03.jpg', '¡Vivan los novios! Os deseamos toda la felicidad del mundo ❤️',    'demo-seed-marta',  'demo', '2026-05-30T22:50:00+02:00'),
  ('demo/lumen-04.jpg', 'Natacha, estás preciosa con ese vestido ✨',                       'demo-seed-ana',    'demo', '2026-05-30T22:10:00+02:00'),
  ('demo/lumen-05.jpg', 'Brindemos por el amor verdadero 🥂',                               'demo-seed-javi',   'demo', '2026-05-30T21:35:00+02:00'),
  ('demo/lumen-06.jpg', 'Los abuelos también se apuntan a la fiesta 👵👴',                   'demo-seed-marta',  'demo', '2026-05-30T20:55:00+02:00'),
  ('demo/lumen-07.jpg', 'Que esto sea el comienzo de una vida llena de aventuras juntos 🌅', 'demo-seed-carlos', 'demo', '2026-05-30T20:20:00+02:00');

commit;
