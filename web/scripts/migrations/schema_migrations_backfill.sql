-- schema_migrations_backfill.sql
--
-- OPTIONAL — only if you adopt the Supabase CLI later. Marks 001-010 as
-- already applied so the CLI doesn't try to re-run them against a database
-- that already has these changes.
--
-- supabase_migrations.schema_migrations.version is a text CLI expects in
-- "YYYYMMDDHHMMSS" order-sortable form, not "001". These placeholder
-- versions preserve the numeric ordering (005 < 006 < ... < 010) but you
-- should rename the .sql files to match if you actually switch to
-- `supabase migration` tooling, since the CLI keys off the filename
-- prefix, not this table alone.
--
-- Run AFTER 001-010 have been applied by hand.

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20260729000001', 'rename_event_id_to_dedication'),
  ('20260729000002', 'add_not_null_constraints'),
  ('20260729000003', 'replace_indexes'),
  ('20260729000004', 'clean_rls_policies'),
  ('20260729000005', 'events_add_columns_and_check'),
  ('20260729000006', 'seed_events_from_photos'),
  ('20260729000007', 'photos_event_key_fk'),
  ('20260729000008', 'event_members_and_membership_fn'),
  ('20260729000009', 'photos_owner_id'),
  ('20260729000010', 'drop_dead_tables')
ON CONFLICT (version) DO NOTHING;
