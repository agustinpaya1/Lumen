-- Lumen / post-migration verification
-- Read-only. Expected result: every boolean is true and policy counts match.

SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'photos'
      AND column_name = 'client_upload_id'
      AND udt_name = 'uuid'
  ) AS client_upload_id_ready,
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.photos'::regclass
      AND conname = 'photos_client_upload_id_key'
      AND contype = 'u'
  ) AS idempotency_constraint_ready,
  EXISTS (
    SELECT 1
    FROM public.events
    WHERE event_key = 'jp-reboda-2026-k7m4q9x2'
      AND name = 'Javier y Paula — Reboda'
      AND event_date = DATE '2026-09-12'
      AND photo_limit = 10
  ) AS event_ready,
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'photos'
      AND policyname = 'Permitir subidas en demo'
  ) AS public_demo_insert_removed,
  (
    SELECT count(*) = 3
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'photos_storage_select_event_members',
        'photos_storage_insert_event_members',
        'photos_storage_delete_own'
      )
  ) AS storage_policies_ready,
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'Acceso Total MVP%'
  ) AS public_storage_crud_removed,
  EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'photos'
  ) AS realtime_ready,
  has_function_privilege(
    'authenticated',
    'public.get_my_event_keys()',
    'EXECUTE'
  ) AS authenticated_membership_function_ready,
  NOT has_function_privilege(
    'anon',
    'public.get_my_event_keys()',
    'EXECUTE'
  ) AS anon_membership_function_blocked;
