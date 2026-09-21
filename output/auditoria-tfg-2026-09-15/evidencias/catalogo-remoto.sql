BEGIN READ ONLY;
SELECT jsonb_build_object(
 'checked_at', now(),
 'rls', (SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('photos','events','event_members','event_admins','application_logs')),
 'policies', (SELECT jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'mode',permissive,'roles',roles,'command',cmd,'using',qual,'check',with_check)) FROM pg_policies WHERE (schemaname='public' AND tablename IN ('photos','events','event_members','event_admins')) OR (schemaname='storage' AND tablename='objects')),
 'buckets', (SELECT jsonb_agg(jsonb_build_object('public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)) FROM storage.buckets WHERE id='photos'),
 'realtime_tables',(SELECT jsonb_agg(tablename) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'),
 'photo_constraints',(SELECT jsonb_agg(pg_get_constraintdef(oid)) FROM pg_constraint WHERE conrelid='public.photos'::regclass),
 'membership_constraints',(SELECT jsonb_agg(pg_get_constraintdef(oid)) FROM pg_constraint WHERE conrelid='public.event_members'::regclass)
) AS audit;
ROLLBACK;
