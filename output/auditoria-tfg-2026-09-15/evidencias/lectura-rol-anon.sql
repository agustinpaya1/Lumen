BEGIN READ ONLY;
SET LOCAL ROLE anon;
SELECT jsonb_build_object('role',current_user,'visible_photos',(SELECT count(*) FROM public.photos),'visible_memberships',(SELECT count(*) FROM public.event_members)) AS visibility;
ROLLBACK;
