-- Isolated policy regression check: all fixtures roll back, including test users.
BEGIN;
CREATE TEMP TABLE launch_test_ids AS SELECT gen_random_uuid() guest, gen_random_uuid() admin;
SELECT set_config('lumen.test_guest',guest::text,true),set_config('lumen.test_admin',admin::text,true) FROM launch_test_ids;
INSERT INTO auth.users(id,is_anonymous) SELECT guest,true FROM launch_test_ids;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous)
SELECT admin,'lumen-policy-test@example.invalid',now(),false FROM launch_test_ids;
INSERT INTO public.events(event_key,name,event_date,uploads_open)
VALUES ('lumen-launch-policy-check','Disposable policy check','2026-09-12',false);
INSERT INTO public.event_members(user_id,event_key) SELECT guest,'lumen-launch-policy-check' FROM launch_test_ids;
INSERT INTO public.event_admins(event_key,email) VALUES ('lumen-launch-policy-check','lumen-policy-test@example.invalid');
INSERT INTO public.photos(id,url,device_id,event_key,owner_id) OVERRIDING SYSTEM VALUE
SELECT -919019,'uploads/lumen-launch-policy-check/test.jpg','policy-check','lumen-launch-policy-check',guest FROM launch_test_ids;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('lumen.test_guest'),'role','authenticated','is_anonymous',true)::text,true);
DO $$ BEGIN
 IF public.is_event_admin('lumen-launch-policy-check') THEN RAISE EXCEPTION 'Guest became admin'; END IF;
 IF EXISTS(SELECT 1 FROM public.photos WHERE id=-919019) THEN RAISE EXCEPTION 'Closed gallery leaked row'; END IF;
 BEGIN
  PERFORM public.set_event_uploads_open('lumen-launch-policy-check',true);
  RAISE EXCEPTION 'Guest opened event';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.events SET uploads_open=true WHERE event_key='lumen-launch-policy-check';
  RAISE EXCEPTION 'Direct update succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.photos(url,device_id,event_key,owner_id) VALUES('uploads/lumen-launch-policy-check/blocked.jpg','policy-check','lumen-launch-policy-check',auth.uid());
  RAISE EXCEPTION 'Photo insert succeeded before opening';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('photos','uploads/lumen-launch-policy-check/blocked.jpg',auth.uid()::text);
  RAISE EXCEPTION 'Storage insert succeeded before opening';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('lumen.test_admin'),'role','authenticated','is_anonymous',false)::text,true);
DO $$ BEGIN
 IF NOT public.is_event_admin('lumen-launch-policy-check') THEN RAISE EXCEPTION 'Verified admin denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.photos WHERE id=-919019) THEN RAISE EXCEPTION 'Admin cannot moderate closed album'; END IF;
 PERFORM public.set_event_uploads_open('lumen-launch-policy-check',true);
 IF NOT public.event_accepts_uploads('lumen-launch-policy-check') THEN RAISE EXCEPTION 'Admin opening failed'; END IF;
END $$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('lumen.test_guest'),'role','authenticated','is_anonymous',true)::text,true);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.photos WHERE id=-919019) THEN RAISE EXCEPTION 'Guest cannot read open album'; END IF;
 INSERT INTO public.photos(url,device_id,event_key,owner_id) VALUES('uploads/lumen-launch-policy-check/allowed.jpg','policy-check','lumen-launch-policy-check',auth.uid());
 INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('photos','uploads/lumen-launch-policy-check/allowed.jpg',auth.uid()::text);
END $$;
SELECT jsonb_build_object('guest_cannot_open',true,'direct_update_blocked',true,'closed_gallery_hidden',true,'closed_photo_insert_blocked',true,'closed_storage_insert_blocked',true,'verified_admin_can_open',true,'admin_can_read_closed_gallery',true,'guest_can_read_and_upload_after_open',true,'fixtures_rolled_back',true) AS checks;
ROLLBACK;
