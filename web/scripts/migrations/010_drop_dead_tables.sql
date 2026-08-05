-- 010_drop_dead_tables.sql
--
-- devices and reported_photos: RLS ON, zero policies, confirmed unused by
-- the app (per diagnostic review). Dead weight — remove them.

DROP TABLE IF EXISTS public.devices;
DROP TABLE IF EXISTS public.reported_photos;
