# Database Migrations

Manual SQL migrations for the Supabase `photos` table.

## How to Run

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Run each `.sql` file **in numeric order** (001, 002, 003, 004).
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

## Important Notes

- **Always back up** your data before running migrations in production.
- Run `001` first — subsequent migrations reference the renamed column.
- After running all migrations, deploy the updated TypeScript code that uses
  `dedication` instead of `event_id`.
