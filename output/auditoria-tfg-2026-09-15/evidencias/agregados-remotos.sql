BEGIN READ ONLY;
SELECT jsonb_build_object(
 'checked_at',now(),
 'totals',(SELECT jsonb_build_object('events',count(*),'open_events',count(*) FILTER(WHERE uploads_open)) FROM public.events),
 'photos',(SELECT jsonb_build_object('rows',count(*),'event_scopes',count(DISTINCT event_key),'distinct_device_ids',count(DISTINCT device_id),'distinct_owner_ids',count(DISTINCT owner_id),'null_owner',count(*) FILTER(WHERE owner_id IS NULL),'null_upload_id',count(*) FILTER(WHERE client_upload_id IS NULL),'distinct_paths',count(DISTINCT url)) FROM public.photos),
 'members',(SELECT jsonb_build_object('memberships',count(*),'distinct_auth_users',count(DISTINCT user_id)) FROM public.event_members),
 'admin_allowlist',(SELECT jsonb_build_object('entries',count(*),'events',count(DISTINCT event_key)) FROM public.event_admins),
 'storage',(SELECT jsonb_build_object('objects',count(*),'unreferenced_paths',count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.photos p WHERE p.url=o.name)),'objects_without_owner',count(*) FILTER(WHERE owner_id IS NULL)) FROM storage.objects o WHERE bucket_id='photos'),
 'photos_without_matching_object',(SELECT count(*) FROM public.photos p WHERE NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='photos' AND o.name=p.url)),
 'by_event',(SELECT jsonb_agg(jsonb_build_object('label',label,'photos',photos,'device_ids',devices,'owner_ids',owners,'memberships',memberships)) FROM (
 SELECT 'E'||row_number() OVER(ORDER BY e.event_key) AS label,
 (SELECT count(*) FROM public.photos p WHERE p.event_key=e.event_key) photos,
 (SELECT count(DISTINCT device_id) FROM public.photos p WHERE p.event_key=e.event_key) devices,
 (SELECT count(DISTINCT owner_id) FROM public.photos p WHERE p.event_key=e.event_key) owners,
 (SELECT count(*) FROM public.event_members m WHERE m.event_key=e.event_key) memberships
 FROM public.events e) x)
) AS aggregates;
ROLLBACK;
