begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
 ('14000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hardening-admin@example.com','','{"display_name":"Virtual Hardening Admin"}',now(),now()),
 ('14000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hardening-ae@example.com','','{"display_name":"담당자 A"}',now(),now());
insert into public.organizations (id,name,type) values
 ('24000000-0000-0000-0000-000000000001','Virtual Hardening Agency','agency'),
 ('24000000-0000-0000-0000-000000000002','Virtual Hardening Advertiser','advertiser');
insert into public.organization_memberships (user_id,organization_id,role) values
 ('14000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','agency_admin'),
 ('14000000-0000-0000-0000-000000000002','24000000-0000-0000-0000-000000000001','ae');
insert into public.brands (id,agency_organization_id,advertiser_organization_id,name,brand_key,domain,archived_at,is_active) values
 ('34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000002','Virtual Archived','virtual-archived','archived.example.com',now(),false);
insert into public.brand_assignments (brand_id,user_id,role) values
 ('34000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000002','ae');
insert into public.content_items (id,brand_id,title,slug,owner_id) values
 ('44000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','Virtual Archived Guide','virtual-archived-guide','14000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);
select is(public.can_access_brand('34000000-0000-0000-0000-000000000001'),true,'administrator retains archived brand management access');
select is(public.can_edit_brand_content('34000000-0000-0000-0000-000000000001'),false,'administrator cannot edit archived brand content');
select is((select count(*) from public.content_items where id='44000000-0000-0000-0000-000000000001'),0::bigint,'archived brand content is hidden by RLS');
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
select is(public.can_access_brand('34000000-0000-0000-0000-000000000001'),true,'assignment record remains visible while archived content stays hidden');
reset role;
select is(has_function_privilege('anon','public.save_content_draft(uuid,integer,text,text,jsonb)','execute'),false,'anonymous role cannot execute draft save RPC');
select is(has_function_privilege('public','public.write_scoped_audit_log()','execute'),false,'PUBLIC cannot execute audit trigger function');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid='public.validate_brand_assignment_scope()'::regprocedure),'SECURITY DEFINER assignment validator has fixed search_path');

select * from finish();
rollback;
