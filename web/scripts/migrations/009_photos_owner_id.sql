-- 009_photos_owner_id.sql
--
-- Add owner_id so a photo can be attributed to an authenticated user going
-- forward. device_id is left untouched — migrating/deprecating anonymous
-- device-based ownership is a separate task, not part of this schema pass.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
