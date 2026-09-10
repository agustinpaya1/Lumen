-- Lumen / Supabase preflight audit
-- Read-only: this script does not create, alter, update, or delete anything.
-- Run it in the Supabase SQL Editor for project gjbggygtztlrcxudbabu.
-- Copy the complete result grid (section + details) back into Codex.

WITH audit AS (
  SELECT
    10 AS sort_order,
    'tables_and_rls'::text AS section,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'schema', namespace.nspname,
          'table', relation.relname,
          'rls_enabled', relation.relrowsecurity,
          'rls_forced', relation.relforcerowsecurity,
          'estimated_rows', relation.reltuples::bigint
        )
        ORDER BY namespace.nspname, relation.relname
      ),
      '[]'::jsonb
    ) AS details
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE relation.relkind IN ('r', 'p')
    AND (
      (namespace.nspname = 'public' AND relation.relname IN ('photos', 'events', 'event_members'))
      OR (namespace.nspname = 'storage' AND relation.relname IN ('buckets', 'objects'))
    )

  UNION ALL

  SELECT
    20,
    'columns',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'table', columns.table_name,
          'position', columns.ordinal_position,
          'column', columns.column_name,
          'type', columns.data_type,
          'udt', columns.udt_name,
          'nullable', columns.is_nullable,
          'default', columns.column_default
        )
        ORDER BY columns.table_name, columns.ordinal_position
      ),
      '[]'::jsonb
    )
  FROM information_schema.columns AS columns
  WHERE columns.table_schema = 'public'
    AND columns.table_name IN ('photos', 'events', 'event_members')

  UNION ALL

  SELECT
    30,
    'constraints',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'table', relation.relname,
          'name', constraint_row.conname,
          'type', constraint_row.contype,
          'validated', constraint_row.convalidated,
          'definition', pg_get_constraintdef(constraint_row.oid, true)
        )
        ORDER BY relation.relname, constraint_row.conname
      ),
      '[]'::jsonb
    )
  FROM pg_constraint AS constraint_row
  JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('photos', 'events', 'event_members')

  UNION ALL

  SELECT
    40,
    'indexes',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'table', indexes.tablename,
          'name', indexes.indexname,
          'definition', indexes.indexdef
        )
        ORDER BY indexes.tablename, indexes.indexname
      ),
      '[]'::jsonb
    )
  FROM pg_indexes AS indexes
  WHERE indexes.schemaname = 'public'
    AND indexes.tablename IN ('photos', 'events', 'event_members')

  UNION ALL

  SELECT
    50,
    'public_rls_policies',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'table', policies.tablename,
          'name', policies.policyname,
          'permissive', policies.permissive,
          'roles', policies.roles,
          'command', policies.cmd,
          'using', policies.qual,
          'with_check', policies.with_check
        )
        ORDER BY policies.tablename, policies.cmd, policies.policyname
      ),
      '[]'::jsonb
    )
  FROM pg_policies AS policies
  WHERE policies.schemaname = 'public'
    AND policies.tablename IN ('photos', 'events', 'event_members')

  UNION ALL

  SELECT
    60,
    'storage_policies',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', policies.policyname,
          'permissive', policies.permissive,
          'roles', policies.roles,
          'command', policies.cmd,
          'using', policies.qual,
          'with_check', policies.with_check
        )
        ORDER BY policies.cmd, policies.policyname
      ),
      '[]'::jsonb
    )
  FROM pg_policies AS policies
  WHERE policies.schemaname = 'storage'
    AND policies.tablename = 'objects'

  UNION ALL

  SELECT
    70,
    'table_grants',
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'schema', grants.table_schema,
          'table', grants.table_name,
          'role', grants.grantee,
          'privilege', grants.privilege_type
        )
      ),
      '[]'::jsonb
    )
  FROM information_schema.role_table_grants AS grants
  WHERE grants.grantee IN ('anon', 'authenticated', 'service_role')
    AND (
      (grants.table_schema = 'public' AND grants.table_name IN ('photos', 'events', 'event_members'))
      OR (grants.table_schema = 'storage' AND grants.table_name = 'objects')
    )

  UNION ALL

  SELECT
    80,
    'membership_function',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', procedures.proname,
          'arguments', pg_get_function_identity_arguments(procedures.oid),
          'returns', pg_get_function_result(procedures.oid),
          'security_definer', procedures.prosecdef,
          'volatility', procedures.provolatile,
          'owner', pg_get_userbyid(procedures.proowner),
          'acl', procedures.proacl
        )
        ORDER BY procedures.proname
      ),
      '[]'::jsonb
    )
  FROM pg_proc AS procedures
  JOIN pg_namespace AS namespace ON namespace.oid = procedures.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedures.proname = 'get_my_event_keys'

  UNION ALL

  SELECT
    90,
    'storage_bucket',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', buckets.id,
          'name', buckets.name,
          'public', buckets.public,
          'file_size_limit', buckets.file_size_limit,
          'allowed_mime_types', buckets.allowed_mime_types
        )
        ORDER BY buckets.id
      ),
      '[]'::jsonb
    )
  FROM storage.buckets AS buckets
  WHERE buckets.id = 'photos'

  UNION ALL

  SELECT
    100,
    'realtime_publication',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'publication', publication.pubname,
          'schema', publication.schemaname,
          'table', publication.tablename
        )
        ORDER BY publication.schemaname, publication.tablename
      ),
      '[]'::jsonb
    )
  FROM pg_publication_tables AS publication
  WHERE publication.pubname = 'supabase_realtime'
    AND publication.schemaname = 'public'
    AND publication.tablename IN ('photos', 'events', 'event_members')
)
SELECT section, details
FROM audit
ORDER BY sort_order;
