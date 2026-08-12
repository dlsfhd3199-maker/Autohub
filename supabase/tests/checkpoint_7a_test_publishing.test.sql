begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function('public','test_publish_content',array['uuid','uuid'],'test publish RPC exists');
select has_function('public','get_test_published_content_list',array['text','text'],'published list RPC exists');
select has_function('public','get_test_published_content_detail',array['text','text','text'],'published detail RPC exists');
select has_column('public','generation_jobs','generation_provider','generation provider is explicitly tracked');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
 ('17000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','publish-admin@example.com','','{"display_name":"가상 관리자"}',now(),now()),
 ('17000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','publish-ae@example.com','','{"display_name":"담당자 A"}',now(),now());
insert into public.organizations (id,name,type) values
 ('27000000-0000-4000-8000-000000000001','Virtual Publish Agency','agency'),
 ('27000000-0000-4000-8000-000000000002','Virtual Publish Advertiser','advertiser');
insert into public.organization_memberships (user_id,organization_id,role) values
 ('17000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001','agency_admin'),
 ('17000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001','ae');
insert into public.brands (id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values
 ('37000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000002','Virtual Publish','virtual-publish','publish.example.com'),
 ('37000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000002','Virtual Other','virtual-other','other.example.com');
insert into public.brand_assignments (brand_id,user_id,role) values ('37000000-0000-4000-8000-000000000001','17000000-0000-4000-8000-000000000002','ae');
insert into public.content_items (id,brand_id,title,slug,owner_id,current_version_id,current_draft_id) values
 ('47000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001','가상 발행 안내','virtual-publish-guide','17000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000002');
insert into public.content_versions (id,brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot,change_summary) values
 ('57000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001','47000000-0000-4000-8000-000000000001',1,'draft','{"schemaVersion":1,"blocks":[{"id":"67000000-0000-4000-8000-000000000001","type":"title","text":"가상 발행 안내"}],"metadata":{"primaryKeyword":"가상 발행","keywords":[],"description":"가상 설명"}}','17000000-0000-4000-8000-000000000001',false,'가상 발행 안내','첫 버전'),
 ('57000000-0000-4000-8000-000000000002','37000000-0000-4000-8000-000000000001','47000000-0000-4000-8000-000000000001',2,'draft','{"schemaVersion":1,"blocks":[{"id":"67000000-0000-4000-8000-000000000002","type":"title","text":"노출 금지 초안"}],"metadata":{"primaryKeyword":"초안","keywords":[],"description":"초안"}}','17000000-0000-4000-8000-000000000001',true,'노출 금지 초안','');

set local role authenticated;
select set_config('request.jwt.claim.sub','17000000-0000-4000-8000-000000000001',true);
insert into public.publishing_connections (brand_id,bearer_key_hash,created_by) values ('37000000-0000-4000-8000-000000000001',repeat('a',64),'17000000-0000-4000-8000-000000000001');
select lives_ok($$select public.test_publish_content('47000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001')$$,'administrator test publishes immutable version');
select is((select published_version_id from public.content_items where id='47000000-0000-4000-8000-000000000001'),'57000000-0000-4000-8000-000000000001'::uuid,'published pointer is fixed to selected version');
select throws_ok($$select public.test_publish_content('47000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000002')$$,'23514','Test publication requires an immutable explicit version','working draft cannot be test published');
select ok(exists(select 1 from public.audit_logs where entity_type='content_items' and entity_id='47000000-0000-4000-8000-000000000001' and action='update'),'test publication creates audit log');

select set_config('request.jwt.claim.sub','17000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.test_publish_content('47000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001')$$,'42501','Test publication requires agency administrator permission','AE cannot test publish');

reset role;
set local role anon;
select is((public.get_test_published_content_list('virtual-publish',repeat('a',64))->'items'->0->>'versionId'),'57000000-0000-4000-8000-000000000001','API returns only selected published version');
select isnt((public.get_test_published_content_detail('virtual-publish','virtual-publish-guide',repeat('a',64))->'item'->>'title'),'노출 금지 초안','working draft is not exposed');
select is(public.get_test_published_content_list('virtual-publish',repeat('b',64)),null,'wrong bearer hash is rejected');
select is(public.get_test_published_content_list('virtual-other',repeat('a',64)),null,'bearer cannot cross brand boundary');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','17000000-0000-4000-8000-000000000001',true);
update public.publishing_connections set status='disabled',disabled_at=now() where brand_id='37000000-0000-4000-8000-000000000001';
reset role;
set local role anon;
select is(public.get_test_published_content_list('virtual-publish',repeat('a',64)),null,'disabled connection returns no content');

select * from finish();
rollback;
