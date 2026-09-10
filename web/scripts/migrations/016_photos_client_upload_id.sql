-- 016_photos_client_upload_id.sql
--
-- Makes the final database step of the offline upload queue idempotent. A
-- browser may receive a successful response and close before deleting its
-- IndexedDB entry; retrying the same UUID must not create a duplicate row.
--
-- Existing photos remain valid with NULL. PostgreSQL UNIQUE constraints allow
-- multiple NULL values, while every new queued upload sends a UUID.

BEGIN;

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS client_upload_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.photos'::regclass
      AND conname = 'photos_client_upload_id_key'
  ) THEN
    ALTER TABLE public.photos
      ADD CONSTRAINT photos_client_upload_id_key UNIQUE (client_upload_id);
  END IF;
END $$;

COMMIT;

-- Verification (run separately):
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'photos'
--   AND column_name = 'client_upload_id';
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.photos'::regclass
--   AND conname = 'photos_client_upload_id_key';
