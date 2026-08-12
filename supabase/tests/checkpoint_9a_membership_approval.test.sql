begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_table('public','membership_applications','membership applications exist');
select has_table('public','user_account_statuses','account statuses exist');
select has_table('public','organization_join_codes','hashed join codes exist');
select function_returns('public','is_account_approved',array[]::text[],'boolean','approved account gate exists');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
('19000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-9a@example.com','','{"display_name":"Virtual Admin"}',now(),now()),
('19000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pending-9a@example.com','','{"display_name":"담당자 A"}',now(),now()),
('19000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','marketer-9a@example.com','','{"display_name":"담당자 B"}',now(),now()),
('19000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','advertiser-9a@example.com','','{"display_name":"담당자 C"}',now(),now());
insert into public.organizations(id,name,type) values
('29000000-0000-4000-8000-000000000001','Virtual 9A Agency','agency'),
('29000000-0000-4000-8000-000000000002','Virtual 9A Advertiser','advertiser');
insert into public.organization_memberships(user_id,organization_id,role) values
('19000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000001','agency_admin'),
('19000000-0000-4000-8000-000000000003','29000000-0000-4000-8000-000000000001','ae'),
('19000000-0000-4000-8000-000000000004','29000000-0000-4000-8000-000000000002','advertiser');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values
('39000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000002','Virtual 9A','virtual-9a','virtual-9a.example.com'),
('39000000-0000-4000-8000-000000000002','29000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000002','Virtual Other 9A','virtual-other-9a','virtual-other-9a.example.com');
insert into public.brand_assignments(brand_id,user_id,role) values
('39000000-0000-4000-8000-000000000001','19000000-0000-4000-8000-000000000003','ae'),
('39000000-0000-4000-8000-000000000001','19000000-0000-4000-8000-000000000004','advertiser');
update public.user_account_statuses set status='pending' where user_id='19000000-0000-4000-8000-000000000002';
insert into public.organization_join_codes(id,organization_id,code_hash,label,created_by) values
('49000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000001',encode(extensions.digest('ephemeral-code','sha256'),'hex'),'Virtual code','19000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','19000000-0000-4000-8000-000000000002',true);
select is(public.is_account_approved(),false,'pending account is not approved');
select is(public.can_access_brand('39000000-0000-4000-8000-000000000001'),false,'pending account cannot access brand');
select is((select count(*) from public.brands),0::bigint,'pending account sees no brands');
select throws_ok($$select public.rotate_local_test_publishing_connection('39000000-0000-4000-8000-000000000001')$$,'42501','Connection management permission denied','pending account cannot configure connection');

select set_config('request.jwt.claim.sub','19000000-0000-4000-8000-000000000003',true);
select ok(public.can_edit_brand_content('39000000-0000-4000-8000-000000000001'),'assigned marketer edits assigned brand');
select is(public.can_access_brand('39000000-0000-4000-8000-000000000002'),false,'marketer cannot access unassigned brand');
select is(public.is_agency_admin('39000000-0000-4000-8000-000000000001'),false,'marketer cannot final publish as admin');
select ok(public.can_configure_brand('39000000-0000-4000-8000-000000000001'),'marketer can configure assigned brand');

select set_config('request.jwt.claim.sub','19000000-0000-4000-8000-000000000004',true);
select ok(public.can_access_brand('39000000-0000-4000-8000-000000000001'),'advertiser reads assigned brand');
select is(public.can_edit_brand_content('39000000-0000-4000-8000-000000000001'),false,'advertiser cannot edit content');

set local role anon;
select is(public.is_valid_join_code(encode(extensions.digest('ephemeral-code','sha256'),'hex')),true,'public join code check returns only validity');
select is(public.is_valid_join_code(encode(extensions.digest('wrong-code','sha256'),'hex')),false,'invalid join code is rejected');

set local role authenticated;
select set_config('request.jwt.claim.sub','19000000-0000-4000-8000-000000000001',true);
select ok(public.is_account_approved(),'administrator is approved');
select ok(public.is_agency_admin('39000000-0000-4000-8000-000000000001'),'administrator manages agency brand');
select is((select count(*) from public.organization_join_codes where code_hash='ephemeral-code'),0::bigint,'raw join code is not stored');

select * from finish();
rollback;
