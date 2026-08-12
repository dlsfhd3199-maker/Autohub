begin;create extension if not exists pgtap with schema extensions;select plan(9);
select has_column('public','user_account_statuses','password_change_required','password gate exists');select has_table('public','advertiser_credential_events','credential audit exists');
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at)values
('1a000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-9b@example.com','','{"display_name":"Virtual Admin"}',now(),now()),
('1a000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','marketer-9b@example.com','','{"display_name":"담당자 A"}',now(),now()),
('1a000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','advertiser-9b@example.com','','{"display_name":"담당자 B"}',now(),now());
insert into public.organizations(id,name,type)values('2a000000-0000-4000-8000-000000000001','Virtual 9B Agency','agency'),('2a000000-0000-4000-8000-000000000002','Virtual 9B Advertiser','advertiser');
insert into public.organization_memberships(user_id,organization_id,role)values('1a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000001','agency_admin'),('1a000000-0000-4000-8000-000000000002','2a000000-0000-4000-8000-000000000001','ae');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain)values('3a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000002','Virtual 9B','virtual-9b','virtual-9b.example.com'),('3a000000-0000-4000-8000-000000000002','2a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000002','Virtual Other 9B','virtual-other-9b','other-9b.example.com');
insert into public.brand_assignments(brand_id,user_id,role)values('3a000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000002','ae');
set local role authenticated;select set_config('request.jwt.claim.sub','1a000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.finalize_advertiser_provisioning('1a000000-0000-4000-8000-000000000003','3a000000-0000-4000-8000-000000000001','담당자 B',null,'temporary_credentials')$$,'assigned marketer provisions advertiser');
select throws_ok($$select public.finalize_advertiser_provisioning('1a000000-0000-4000-8000-000000000003','3a000000-0000-4000-8000-000000000002','담당자 B',null,'temporary_credentials')$$,'42501','Provisioning permission denied','unassigned brand blocked');
select is((select password_change_required from public.user_account_statuses where user_id='1a000000-0000-4000-8000-000000000003'),true,'temporary password change required');
select is((select count(*) from public.brand_assignments where user_id='1a000000-0000-4000-8000-000000000003' and role='advertiser'),1::bigint,'advertiser assigned once');
select set_config('request.jwt.claim.sub','1a000000-0000-4000-8000-000000000003',true);select is(public.is_account_approved(),false,'password gate blocks workspace');select lives_ok($$select public.mark_password_changed()$$,'advertiser marks password changed');select is(public.is_account_approved(),true,'changed password unlocks approved account');
select * from finish();rollback;
