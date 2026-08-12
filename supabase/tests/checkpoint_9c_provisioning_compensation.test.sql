begin;create extension if not exists pgtap with schema extensions;select plan(7);
select has_table('public','advertiser_provisioning_requests','idempotency ledger exists');
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
('1c000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-9c@example.com','','{"display_name":"Virtual Admin"}',now(),now());
insert into public.organizations(id,name,type) values('2c000000-0000-4000-8000-000000000001','Virtual 9C Agency','agency'),('2c000000-0000-4000-8000-000000000002','Virtual 9C Advertiser','advertiser');
insert into public.organization_memberships(user_id,organization_id,role) values('1c000000-0000-4000-8000-000000000001','2c000000-0000-4000-8000-000000000001','agency_admin');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values('3c000000-0000-4000-8000-000000000001','2c000000-0000-4000-8000-000000000001','2c000000-0000-4000-8000-000000000002','Virtual 9C','virtual-9c','virtual-9c.example.com');
set local role authenticated;select set_config('request.jwt.claim.sub','1c000000-0000-4000-8000-000000000001',true);
select is(public.record_advertiser_provisioning_event('4c000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000001',repeat('a',64),'provisioning_started'), 'provisioning_started','starts request');
select is(public.record_advertiser_provisioning_event('4c000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000001',repeat('a',64),'auth_user_created'), 'auth_user_created','records auth creation');
select is(public.record_advertiser_provisioning_event('4c000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000001',repeat('a',64),'compensation_succeeded'), 'compensation_succeeded','records compensation');
select throws_ok($$select public.record_advertiser_provisioning_event('4c000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000001',repeat('b',64),'provisioning_started')$$,'42501','Provisioning request mismatch','idempotency mismatch blocked');
select is((select count(*) from public.advertiser_provisioning_requests where id='4c000000-0000-4000-8000-000000000001'),1::bigint,'retry does not duplicate request');
select is((select count(*) from public.audit_logs where entity_id='4c000000-0000-4000-8000-000000000001'),3::bigint,'safe lifecycle events audited');
select * from finish();rollback;
