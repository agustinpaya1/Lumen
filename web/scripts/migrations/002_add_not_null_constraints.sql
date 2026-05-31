-- 002_add_not_null_constraints.sql
--
-- url: a photo row without a storage path is a broken record.
-- device_id: anonymous ownership requires a device identifier.
-- dedication remains nullable — it is optional free text.

-- Backfill any nulls first (should be none in production).
UPDATE public.photos SET url = '' WHERE url IS NULL;
ALTER TABLE public.photos ALTER COLUMN url SET NOT NULL;

-- Without device_id, the user cannot see or delete their own photos.
UPDATE public.photos SET device_id = 'unknown' WHERE device_id IS NULL;
ALTER TABLE public.photos ALTER COLUMN device_id SET NOT NULL;

-- dedication remains nullable — it is optional free text.
