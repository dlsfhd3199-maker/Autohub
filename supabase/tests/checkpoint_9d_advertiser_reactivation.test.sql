begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
('1d000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-9d@example.com','','{"display_name":"Virtual Admin"}',now(),now()),
('1d000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','advertiser-9d@example.com','','{"display_name":"Virtual Advertiser"}',now(),now()),
('1d000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','marketer-9d@example.com','','{"display_name":"Virtual Marketer"}',now(),now());
insert into public.organizations(id,name,type) values('2d000000-0000-4000-8000-000000000001','Virtual 9D Agency','agency'),('2d000000-0000-4000-8000-000000000002','Virtual 9D Advertiser','advertiser');
insert into public.organization_memberships(user_id,organization_id,role) values
('1d000000-0000-4000-8000-000000000001','2d000000-0000-4000-8000-000000000001','agency_admin'),
('1d000000-0000-4000-8000-000000000002','2d000000-0000-4000-8000-000000000002','advertiser'),
('1d000000-0000-4000-8000-000000000003','2d000000-0000-4000-8000-000000000001','ae');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values('3d000000-0000-4000-8000-000000000001','2d000000-0000-4000-8000-000000000001','2d000000-0000-4000-8000-000000000002','Virtual 9D','virtual-9d','virtual-9d.example.com');
insert into public.brand_assignments(brand_id,user_id,role) values('3d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','advertiser'),('3d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000003','ae');
update public.user_account_statuses set status='suspended',disabled_at=now() where user_id='1d000000-0000-4000-8000-000000000002';
set local role authenticated; select set_config('request.jwt.claim.sub','1d000000-0000-4000-8000-000000000001',true);
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started'),'reactivation_started','admin starts recovery');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','auth_unbanned'),'auth_unbanned','auth event recorded');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','temporary_credential_rotated'),'temporary_credential_rotated','credential event recorded');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_completed'),'reactivation_completed','recovery completes');
select is((select status::text from public.user_account_statuses where user_id='1d000000-0000-4000-8000-000000000002'),'approved','account approved');
select ok((select password_change_required from public.user_account_statuses where user_id='1d000000-0000-4000-8000-000000000002'),'password change required');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started'),'reactivation_completed','completed retry is idempotent');
select set_config('request.jwt.claim.sub','1d000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000002','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started')$$,'42501','Reactivation permission denied','marketer blocked');
select set_config('request.jwt.claim.sub','1d000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000003','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started')$$,'42501','Reactivation permission denied','advertiser blocked');
select ok(not public.is_account_approved(),'must-change advertiser blocked from protected data');
set local role postgres;
select set_config('request.jwt.claim.sub','1d000000-0000-4000-8000-000000000001',true);
update public.user_account_statuses set status='suspended',password_change_required=false where user_id='1d000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000004','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started'),'reactivation_started','compensation request starts');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000004','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_compensation_succeeded'),'reactivation_compensation_succeeded','successful compensation recorded');
select is((select status::text from public.user_account_statuses where user_id='1d000000-0000-4000-8000-000000000002'),'suspended','successful compensation keeps account suspended');
select set_config('request.jwt.claim.sub','1d000000-0000-4000-8000-000000000001',true);
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000005','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_started'),'reactivation_started','manual cleanup request starts');
select is(public.record_advertiser_reactivation_event('4d000000-0000-4000-8000-000000000005','1d000000-0000-4000-8000-000000000002','3d000000-0000-4000-8000-000000000001','reactivation_compensation_failed','MANUAL_CLEANUP_REQUIRED'),'reactivation_compensation_failed','failed compensation recorded');
select is((select status::text from public.user_account_statuses where user_id='1d000000-0000-4000-8000-000000000002'),'manual_cleanup_required','failed compensation blocks account');
select * from finish(); rollback;
