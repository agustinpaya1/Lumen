# Database Migrations

Manual SQL migrations for the Supabase `photos` table.

## How to Run

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Run each `.sql` file **in numeric order** (001 through 019).
3. Each file is **idempotent where possible** — safe to re-run if interrupted.

> **There is no auto-migration in this stack.** These files are applied manually
> through the Supabase dashboard SQL editor.

## Migration Index

| File | Purpose |
|------|---------|
| `001_rename_event_id_to_dedication.sql` | Rename the misnamed `event_id` column to `dedication` |
| `002_add_not_null_constraints.sql` | Add `NOT NULL` on `url` and `device_id` (backfills nulls first) |
| `003_replace_indexes.sql` | Add composite indexes, drop redundant single-column index |
| `004_clean_rls_policies.sql` | Replace overlapping RLS policies with explicit per-operation set |
| `005_events_add_columns_and_check.sql` | Extend and validate the event model |
| `006_seed_events_from_photos.sql` | Seed events already referenced by photos |
| `007_photos_event_key_fk.sql` | Add the photos-to-events foreign key |
| `008_event_members_and_membership_fn.sql` | Add anonymous event membership support |
| `009_photos_owner_id.sql` | Record the authenticated owner of each photo |
| `010_drop_dead_tables.sql` | Remove obsolete tables |
| `011_cleanup_duplicate_fk_and_reported_photos.sql` | Clean duplicate constraints and reported-photo data |
| `012_event_members_rls.sql` | Protect event membership with RLS |
| `013_photos_select_members_only.sql` | Restrict photo reads to event members |
| `014_photos_insert_owner_and_member.sql` | Restrict inserts to authenticated members and owners |
| `015_photos_delete_owner_only.sql` | Restrict deletion to the photo owner |
| `016_photos_client_upload_id.sql` | Add the client idempotency key required by the offline queue |
| `017_harden_storage_and_enable_realtime.sql` | Replace public Storage CRUD and publish photos through Realtime |
| `018_seed_javier_paula_event.sql` | Provision the Javier and Paula reboda event |
| `019_event_launch_and_admin.sql` | Manual launch, verified-email admins, server-side upload gates |

## Important Notes

- **Always back up** your data before running migrations in production.
- Run `001` first — subsequent migrations reference the renamed column.
- Apply `016` before deploying a frontend that includes the offline upload queue.
- Migrations `017` and `018` are tailored to the production audit from 2026-09-07.
- Migration `019` was applied through the Supabase connector on 2026-09-08. Existing events remain open until explicitly paused. Admin provisioning and tests: `web/docs/mobile-launch.md`.
- After running all migrations, deploy the updated TypeScript code that uses
  `dedication` instead of `event_id`.
