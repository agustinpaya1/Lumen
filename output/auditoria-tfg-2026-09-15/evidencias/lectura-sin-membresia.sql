BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"5d415702-6c07-49e9-98c7-37ca1352eac2","role":"authenticated","is_anonymous":true}',true);
SELECT jsonb_build_object('role',current_user,'visible_photos',(SELECT count(*) FROM public.photos),'visible_memberships',(SELECT count(*) FROM public.event_members),'is_any_event_admin',(SELECT coalesce(bool_or(public.is_event_admin(event_key)),false) FROM public.events)) AS visibility;
ROLLBACK;
