begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
select has_table('public','publication_records','publication records exist');
select has_column('public','publishing_connections','provider','connections have provider');
select has_column('public','publishing_connections','credential_reference','credential reference exists');
select has_function('public','get_publishing_connection_summaries',array['uuid'],'safe summary RPC exists');
select has_function('public','record_test_publication',array['uuid','uuid','uuid','text','uuid','text'],'idempotent publication RPC exists');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('18000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','connector-admin@example.com','',now(),now()),
('18000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','connector-ae@example.com','',now(),now()),
('18000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','connector-other@example.com','',now(),now());
insert into public.organizations(id,name,type) values('28000000-0000-4000-8000-000000000001','Virtual Connector Agency','agency'),('28000000-0000-4000-8000-000000000002','Virtual Connector Client','advertiser');
insert into public.organization_memberships(user_id,organization_id,role) values('18000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','agency_admin'),('18000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001','ae');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values('38000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000002','Virtual Connector','virtual-connector','connector.example.com'),('38000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000002','Virtual Other Connector','virtual-other-connector','other-connector.example.com');
insert into public.brand_assignments(brand_id,user_id,role) values('38000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000002','ae');
insert into public.content_items(id,brand_id,title,slug,owner_id,current_version_id,current_draft_id) values('48000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','Virtual Connector Guide','virtual-connector-guide','18000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000002');
insert into public.content_versions(id,brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot) values
('58000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001',1,'draft','{"schemaVersion":1,"blocks":[{"id":"68000000-0000-4000-8000-000000000001","type":"paragraph","text":"Virtual body"}],"metadata":{"primaryKeyword":"virtual","keywords":[],"description":"Virtual"}}','18000000-0000-4000-8000-000000000001',false,'Virtual Connector Guide'),
('58000000-0000-4000-8000-000000000002','38000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001',2,'draft','{"schemaVersion":1,"blocks":[{"id":"68000000-0000-4000-8000-000000000002","type":"paragraph","text":"Working"}],"metadata":{"primaryKeyword":"virtual","keywords":[],"description":"Virtual"}}','18000000-0000-4000-8000-000000000001',true,'Working');
update public.content_versions set is_working_draft=false where id='58000000-0000-4000-8000-000000000002';
insert into public.content_versions(id,brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot) values
('58000000-0000-4000-8000-000000000003','38000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001',3,'draft','{"schemaVersion":1,"blocks":[{"id":"68000000-0000-4000-8000-000000000003","type":"paragraph","text":"Working"}],"metadata":{"primaryKeyword":"virtual","keywords":[],"description":"Virtual"}}','18000000-0000-4000-8000-000000000001',true,'Working');
select lives_ok($$insert into public.generation_jobs(brand_id,requested_by,topic,primary_keyword,status,idempotency_key,model,generation_provider) values('38000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','Virtual topic','virtual','cancelled','98000000-0000-4000-8000-000000000001','deterministic-fake-v1','fake')$$,'fake provider model is recorded explicitly');

set local role authenticated; select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000001',true);
insert into public.publishing_connections(id,brand_id,provider,connection_status,bearer_key_hash,created_by,connected_by,credential_reference,granted_capabilities) values('78000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','local-test-store','connected',repeat('a',64),'18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','local-virtual://connector','["publish"]'::jsonb);
select lives_ok($$select public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000001','blog','88000000-0000-4000-8000-000000000001',repeat('b',64))$$,'explicit version publishes');
select is((public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000001','blog','88000000-0000-4000-8000-000000000001',repeat('b',64))->>'replayed')::boolean,true,'same request replays');
select is((public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000001','blog','88000000-0000-4000-8000-000000000002',repeat('b',64))->>'replayed')::boolean,true,'same version new request does not duplicate');
select is((select count(*)::int from public.publication_records where connection_id='78000000-0000-4000-8000-000000000001'),1,'one publication record remains');
select lives_ok($$select public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000002','blog','88000000-0000-4000-8000-000000000003',repeat('c',64))$$,'new explicit version republishes');
select is((select count(*)::int from public.publication_records where connection_id='78000000-0000-4000-8000-000000000001'),2,'new version creates a second record');
select throws_ok($$select public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000003','blog','88000000-0000-4000-8000-000000000005',repeat('d',64))$$,'23514','Explicit immutable version required','working draft blocked');
select ok(not ((public.get_publishing_connection_summaries('38000000-0000-4000-8000-000000000001')->0) ? 'credentialReference'),'summary omits credential reference');
select ok(not ((public.get_publishing_connection_summaries('38000000-0000-4000-8000-000000000001')->0) ? 'bearerKeyHash'),'summary omits bearer hash');
update public.publishing_connections set connection_status='disabled' where id='78000000-0000-4000-8000-000000000001';
select throws_ok($$select public.record_test_publication('78000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','58000000-0000-4000-8000-000000000001','other','88000000-0000-4000-8000-000000000004',repeat('b',64))$$,'55000','Publishing connection disabled','disabled connection blocked');
select ok(exists(select 1 from public.audit_logs where entity_type='publication_records'),'publication audit exists');
select ok(exists(select 1 from public.audit_logs where entity_type='publishing_connections'),'connection audit exists');
select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.get_publishing_connection_summaries('38000000-0000-4000-8000-000000000001')$$,'42501','Brand access denied','unassigned user blocked');
select * from finish(); rollback;
