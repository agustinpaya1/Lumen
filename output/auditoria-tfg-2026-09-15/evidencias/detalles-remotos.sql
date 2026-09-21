BEGIN READ ONLY;
SELECT jsonb_build_object('checked_at',now(),
'missing_object_rows',(SELECT jsonb_build_object('absolute_http_urls',count(*) FILTER(WHERE url ~ '^https?://'),'relative_paths',count(*) FILTER(WHERE url !~ '^https?://')) FROM public.photos p WHERE NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='photos' AND o.name=p.url)),
'function_grants',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_my_event_keys','is_event_admin','get_event_state','set_event_uploads_open')),
'photo_columns',(SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default)) FROM information_schema.columns WHERE table_schema='public' AND table_name='photos'),
'observability_functions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('ingest_application_log','claim_application_log_alert','finish_application_log_alert'))
) AS details;
ROLLBACK;
