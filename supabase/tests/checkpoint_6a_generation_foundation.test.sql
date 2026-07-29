begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_table('public','brand_knowledge_profiles','brand knowledge profiles exist');
select has_table('public','evidence_sources','evidence sources exist');
select has_table('public','generation_jobs','generation jobs exist');
select has_table('public','publishing_connections','publishing connections exist');
select has_column('public','generation_jobs','actual_cost_usd','actual API usage cost is stored separately from the preflight estimate');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
 ('16000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','poc-admin@example.com','','{"display_name":"Virtual Admin"}',now(),now()),
 ('16000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','poc-ae@example.com','','{"display_name":"담당자 A"}',now(),now()),
 ('16000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','poc-other-ae@example.com','','{"display_name":"담당자 B"}',now(),now()),
 ('16000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','poc-advertiser@example.com','','{"display_name":"가상 광고주"}',now(),now());
insert into public.organizations (id,name,type) values
 ('26000000-0000-4000-8000-000000000001','Virtual PoC Agency','agency'),('26000000-0000-4000-8000-000000000002','Virtual PoC Advertiser','advertiser');
insert into public.organization_memberships (user_id,organization_id,role) values
 ('16000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','agency_admin'),
 ('16000000-0000-4000-8000-000000000002','26000000-0000-4000-8000-000000000001','ae'),
 ('16000000-0000-4000-8000-000000000003','26000000-0000-4000-8000-000000000001','ae'),
 ('16000000-0000-4000-8000-000000000004','26000000-0000-4000-8000-000000000002','advertiser');
insert into public.brands (id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values
 ('36000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000002','Virtual Lumi','virtual-poc-lumi','poc-lumi.example.com'),
 ('36000000-0000-4000-8000-000000000002','26000000-0000-4000-8000-000000000001','26000000-0000-4000-8000-000000000002','Virtual Paw','virtual-poc-paw','poc-paw.example.com');
insert into public.brand_assignments (brand_id,user_id,role) values
 ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000002','ae'),
 ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000004','advertiser');
insert into public.content_items (id,brand_id,title,slug,owner_id) values
 ('46000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','Virtual PoC Guide','virtual-poc-guide','16000000-0000-4000-8000-000000000001');
insert into public.content_versions (id,brand_id,content_id,version_no,status,body_json,created_by,is_working_draft,title_snapshot) values
 ('56000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','46000000-0000-4000-8000-000000000001',1,'draft','{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}','16000000-0000-4000-8000-000000000001',false,'Virtual PoC Guide');

set local role authenticated;
select set_config('request.jwt.claim.sub','16000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.brand_knowledge_profiles (brand_id,introduction,target_audience,tone,created_by,updated_by) values ('36000000-0000-4000-8000-000000000001','Virtual introduction','Virtual audience','Calm','16000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001')$$,'admin creates brand knowledge');
select lives_ok($$insert into public.evidence_sources (brand_id,title,official_url,evidence_text,content_hash,created_by) values ('36000000-0000-4000-8000-000000000001','Virtual Official Source','https://example.com/source','Virtual official evidence text for the content proof.','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','16000000-0000-4000-8000-000000000001')$$,'admin creates evidence');
select lives_ok($$insert into public.generation_jobs (brand_id,requested_by,topic,primary_keyword,status,idempotency_key) values ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001','Virtual topic','virtual keyword','planning','66000000-0000-4000-8000-000000000001')$$,'admin creates generation job');
update public.generation_jobs set status='plan_ready' where idempotency_key='66000000-0000-4000-8000-000000000001';
select lives_ok($$update public.content_items set published_version_id='56000000-0000-4000-8000-000000000001',published_at=now(),publication_updated_at=now(),status='published' where id='46000000-0000-4000-8000-000000000001'$$,'admin can test publish an explicit version');
select ok(exists(select 1 from public.audit_logs where entity_type='generation_jobs' and action='insert'),'generation job creates audit log');

select set_config('request.jwt.claim.sub','16000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.brand_knowledge_profiles),1::bigint,'assigned AE reads brand knowledge');
select lives_ok($$update public.brand_knowledge_profiles set tone='Clear virtual tone',updated_by='16000000-0000-4000-8000-000000000002' where brand_id='36000000-0000-4000-8000-000000000001'$$,'assigned AE updates brand knowledge');
select lives_ok($$insert into public.generation_jobs (brand_id,requested_by,topic,primary_keyword,status,idempotency_key) values ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000002','Virtual AE topic','virtual ae','planning','66000000-0000-4000-8000-000000000002')$$,'assigned AE creates generation job');
select throws_ok($$update public.content_items set publication_updated_at=clock_timestamp() + interval '1 second' where id='46000000-0000-4000-8000-000000000001'$$,'42501','Test publication requires agency administrator permission','AE cannot test publish');

select set_config('request.jwt.claim.sub','16000000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.brand_knowledge_profiles),0::bigint,'unassigned AE cannot read brand knowledge');
select throws_ok($$insert into public.generation_jobs (brand_id,requested_by,topic,primary_keyword,status,idempotency_key) values ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000003','Forbidden','forbidden','planning','66000000-0000-4000-8000-000000000003')$$,'42501','new row violates row-level security policy for table "generation_jobs"','unassigned AE cannot create generation job');

select set_config('request.jwt.claim.sub','16000000-0000-4000-8000-000000000004',true);
select is((select count(*) from public.evidence_sources),0::bigint,'advertiser cannot read generation evidence');
select throws_ok($$insert into public.generation_jobs (brand_id,requested_by,topic,primary_keyword,status,idempotency_key) values ('36000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000004','Forbidden','forbidden','planning','66000000-0000-4000-8000-000000000004')$$,'42501','new row violates row-level security policy for table "generation_jobs"','advertiser cannot create generation job');
select is((select count(*) from public.content_items where id='46000000-0000-4000-8000-000000000001'),1::bigint,'advertiser retains allowed content read access');

select * from finish();
rollback;
