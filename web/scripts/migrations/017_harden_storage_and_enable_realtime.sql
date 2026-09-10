-- 017_harden_storage_and_enable_realtime.sql
--
-- Tailored to the production state audited on 2026-09-07. This migration:
--   1. removes the remaining public INSERT exception on demo photos;
--   2. limits the membership helper to authenticated callers;
--   3. replaces the public Storage CRUD policies with event/owner policies;
--   4. enables Realtime for public.photos.
--
-- The photos bucket deliberately remains public. Public asset delivery does
-- not require a SELECT policy on storage.objects; listing and signed URL
-- creation do, and are restricted below to authenticated event members.

BEGIN;

-- Anonymous visitors are signed in invisibly by SessionService and therefore
-- use the authenticated role. Keeping this legacy anon policy would let a bare
-- public API key insert unowned rows into demo.
DROP POLICY IF EXISTS "Permitir subidas en demo" ON public.photos;

-- SECURITY DEFINER helpers are executable by PUBLIC unless explicitly
-- revoked. Qualify the table and use an empty search_path to minimise the
-- function's privilege surface.
CREATE OR REPLACE FUNCTION public.get_my_event_keys()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT event_key
  FROM public.event_members
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_event_keys() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_event_keys() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_event_keys() TO authenticated, service_role;

-- Remove the four audited MVP policies. Their names come from production,
-- not from the historical setup document.
DROP POLICY IF EXISTS "Acceso Total MVP 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Total MVP 1io9m69_1" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Total MVP 1io9m69_2" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Total MVP 1io9m69_3" ON storage.objects;

-- Idempotency for a safe re-run of this file.
DROP POLICY IF EXISTS "photos_storage_select_event_members" ON storage.objects;
DROP POLICY IF EXISTS "photos_storage_insert_event_members" ON storage.objects;
DROP POLICY IF EXISTS "photos_storage_delete_own" ON storage.objects;

-- Needed by Storage's INSERT ... RETURNING flow and by signed URL operations.
-- Existing public image URLs continue to work because the bucket is public.
CREATE POLICY "photos_storage_select_event_members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      (
        (storage.foldername(name))[1] = 'uploads'
        AND (storage.foldername(name))[2]
          IN (SELECT public.get_my_event_keys())
      )
      OR owner_id = (SELECT auth.uid()::text)
    )
  );

-- New Lumen uploads use uploads/<event>/<device>/<uuid>.jpg. The event folder
-- must be one of the caller's memberships and the object must be owned by the
-- JWT subject assigned by Supabase Storage.
CREATE POLICY "photos_storage_insert_event_members"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2]
      IN (SELECT public.get_my_event_keys())
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg')
    AND owner_id = (SELECT auth.uid()::text)
  );

-- No UPDATE policy is created because Lumen never overwrites or moves files.
-- DELETE is tied to the owner assigned by the authenticated upload.
CREATE POLICY "photos_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND owner_id = (SELECT auth.uid()::text)
  );

-- ALTER PUBLICATION errors if a table is already present, so guard it through
-- the catalogue to keep this migration repeatable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'photos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.photos';
  END IF;
END $$;

COMMIT;
