begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at) values
 ('13000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','studio-admin@example.com','','{"display_name":"가상 스튜디오 관리자"}',now(),now()),
 ('13000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','editor-a@example.com','','{"display_name":"담당자 A"}',now(),now()),
 ('13000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','editor-b@example.com','','{"display_name":"담당자 B"}',now(),now()),
 ('13000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','studio-reader@example.com','','{"display_name":"가상 광고주 담당자"}',now(),now());
insert into public.organizations (id,name,type) values
 ('23000000-0000-0000-0000-000000000001','Virtual Studio Agency','agency'),
 ('23000000-0000-0000-0000-000000000002','Virtual Other Agency','agency'),
 ('23000000-0000-0000-0000-000000000003','Virtual Studio Advertiser','advertiser');
insert into public.organization_memberships (user_id,organization_id,role) values
 ('13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','agency_admin'),
 ('13000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000001','ae'),
 ('13000000-0000-0000-0000-000000000003','23000000-0000-0000-0000-000000000002','ae'),
 ('13000000-0000-0000-0000-000000000004','23000000-0000-0000-0000-000000000003','advertiser');
insert into public.brands (id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values
 ('33000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000003','Virtual Studio','virtual-studio','studio.example.com'),
 ('33000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000003','Virtual Other','virtual-other','other.example.com');
insert into public.brand_assignments (brand_id,user_id,role) values
 ('33000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','ae'),
 ('33000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000004','advertiser');
insert into public.content_items (id,brand_id,title,slug,owner_id,primary_keyword) values
 ('43000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','Virtual Studio Guide','virtual-studio-guide','13000000-0000-0000-0000-000000000002','virtual keyword'),
 ('43000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','Virtual Other Guide','virtual-other-guide','13000000-0000-0000-0000-000000000003','other keyword');
insert into public.content_versions (id,brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot) values
 ('53000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001',1,'draft','{"schemaVersion":1,"blocks":[{"id":"63000000-0000-0000-0000-000000000001","type":"paragraph","text":"Virtual initial text"}],"metadata":{"primaryKeyword":"virtual keyword","keywords":[],"description":""}}','13000000-0000-0000-0000-000000000002',true,'Virtual Studio Guide'),
 ('53000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','43000000-0000-0000-0000-000000000002',1,'draft','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}','13000000-0000-0000-0000-000000000003',true,'Virtual Other Guide'),
 ('53000000-0000-0000-0000-000000000009','33000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001',9,'approved','{"schemaVersion":1,"blocks":[{"id":"63000000-0000-0000-0000-000000000009","type":"answer","text":"Approved virtual answer"}],"metadata":{"primaryKeyword":"approved virtual","keywords":[],"description":""}}','13000000-0000-0000-0000-000000000001',false,'Approved Virtual Guide');
update public.content_items set current_draft_id='53000000-0000-0000-0000-000000000001' where id='43000000-0000-0000-0000-000000000001';
update public.content_items set current_draft_id='53000000-0000-0000-0000-000000000002' where id='43000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select is((public.save_content_draft('43000000-0000-0000-0000-000000000001',1,'Virtual Saved Guide','saved keyword','{"schemaVersion":1,"blocks":[{"id":"63000000-0000-0000-0000-000000000001","type":"paragraph","text":"Saved virtual text"}],"metadata":{"primaryKeyword":"saved keyword","keywords":[],"description":""}}')->>'ok')::boolean,true,'admin saves working draft');
select is((select revision from public.content_versions where id='53000000-0000-0000-0000-000000000001'),2,'successful save increments revision');
select is((public.save_content_draft('43000000-0000-0000-0000-000000000001',1,'Stale','stale','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')->>'conflict')::boolean,true,'stale revision returns conflict');
select is((public.save_content_draft('43000000-0000-0000-0000-000000000001',2,'Concurrent Winner','winner','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')->>'ok')::boolean,true,'first concurrent save succeeds');
select is((public.save_content_draft('43000000-0000-0000-0000-000000000001',2,'Concurrent Loser','loser','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')->>'conflict')::boolean,true,'second concurrent save conflicts');
select ok(exists(select 1 from public.audit_logs where entity_type='content_versions' and action='update' and actor_id='13000000-0000-0000-0000-000000000001'),'autosave creates audit log');
select is((public.create_content_version('43000000-0000-0000-0000-000000000001','Virtual version one')->>'versionNo')::integer,1,'explicit version finalizes current draft');
select throws_ok($$update public.content_versions set title_snapshot='Forbidden' where id='53000000-0000-0000-0000-000000000001'$$,'55000','Immutable content versions cannot be changed','snapshot update is blocked');
select throws_ok($$delete from public.content_versions where id='53000000-0000-0000-0000-000000000001'$$,'55000','Immutable content versions cannot be changed','snapshot delete is blocked');
select is((select version_no from public.content_versions where id=(select current_draft_id from public.content_items where id='43000000-0000-0000-0000-000000000001')),2,'new working draft gets next version number');
select is((public.restore_content_version('43000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000009')->>'versionNo')::integer,10,'approved version can seed a new draft');
select throws_ok($$insert into public.content_versions (brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot) values ('33000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000002',20,'draft','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}','13000000-0000-0000-0000-000000000001',false,'Cross brand')$$,'23503','insert or update on table "content_versions" violates foreign key constraint "content_versions_content_scope_fk"','cross-brand version link is blocked');

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000002',true);
select is((public.save_content_draft('43000000-0000-0000-0000-000000000001',1,'AE Save','ae keyword','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')->>'ok')::boolean,true,'assigned AE saves draft');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.save_content_draft('43000000-0000-0000-0000-000000000001',2,'Forbidden','', '{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')$$,'42501','Content edit permission denied','unassigned AE cannot save draft');
select is((select count(*) from public.content_items where id='43000000-0000-0000-0000-000000000001'),0::bigint,'arbitrary content id is hidden from unassigned AE');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.save_content_draft('43000000-0000-0000-0000-000000000001',2,'Forbidden','', '{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}')$$,'42501','Content edit permission denied','advertiser cannot save draft');

select * from finish(); rollback;
