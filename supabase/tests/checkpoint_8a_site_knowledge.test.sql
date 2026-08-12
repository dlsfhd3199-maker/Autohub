begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public','brand_site_sources','brand site sources exist');
select has_table('public','crawl_runs','crawl runs exist');
select has_table('public','source_documents','source documents exist');
select has_table('public','brand_knowledge_facts','reviewable facts exist');
select has_table('public','brand_products','reviewable products exist');
select has_column('public','brand_site_sources','verification_status','domain verification status exists');
select has_column('public','brand_products','field_review_status','product fields have independent review status');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
('18000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','crawl-admin@example.com','','{"display_name":"Virtual Admin"}',now(),now()),
('18000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','crawl-ae@example.com','','{"display_name":"담당자 A"}',now(),now()),
('18000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','crawl-advertiser@example.com','','{"display_name":"담당자 B"}',now(),now()),
('18000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','crawl-other@example.com','','{"display_name":"담당자 C"}',now(),now());
insert into public.organizations(id,name,type) values
('28000000-0000-4000-8000-000000000001','Virtual Crawl Agency','agency'),('28000000-0000-4000-8000-000000000002','Virtual Crawl Advertiser','advertiser');
insert into public.organization_memberships(user_id,organization_id,role) values
('18000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','agency_admin'),
('18000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001','ae'),
('18000000-0000-4000-8000-000000000003','28000000-0000-4000-8000-000000000002','advertiser'),
('18000000-0000-4000-8000-000000000004','28000000-0000-4000-8000-000000000001','ae');
insert into public.brands(id,agency_organization_id,advertiser_organization_id,name,brand_key,domain) values
('38000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000002','Virtual Crawl','virtual-crawl','crawl.example.com'),
('38000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000002','Virtual Other','virtual-other','other.example.com');
insert into public.brand_assignments(brand_id,user_id,role) values
('38000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000002','ae'),
('38000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000003','advertiser');

set local role authenticated;
select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.brand_site_sources(id,brand_id,base_url,allowed_domains,platform_type,is_primary,status,verification_status,verification_method,verified_at,verified_by,created_by,updated_by)
values('68000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','http://127.0.0.1:3100','["127.0.0.1"]','local-test-store',true,'ready','verified','local-test-exception',now(),'18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001')$$,'admin creates verified local source');
select lives_ok($$insert into public.crawl_runs(id,brand_id,source_id,requested_by,status) values('78000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','completed')$$,'admin creates crawl run');
select lives_ok($$insert into public.source_documents(id,brand_id,source_id,crawl_run_id,source_url,final_url,page_type,http_status,content_type,visible_text,raw_html_snapshot,content_hash)
values('88000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','http://127.0.0.1:3100/products/virtual-one','http://127.0.0.1:3100/products/virtual-one','product',200,'text/html','Virtual product text','<html>Virtual</html>','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$,'local source permits bounded HTML snapshot');
select lives_ok($$insert into public.brand_knowledge_facts(id,brand_id,source_document_id,source_url,fact_type,fact_key,fact_value,fact_hash,risk_level,status)
values('98000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','http://127.0.0.1:3100/products/virtual-one','product','price','19900','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','price','needs_review')$$,'admin inserts extracted fact');
select lives_ok($$insert into public.brand_products(id,brand_id,source_document_id,product_key,name,official_url,price,currency,product_hash,status)
values('a8000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','virtual-one','Virtual Product One','http://127.0.0.1:3100/products/virtual-one',19900,'KRW','cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','needs_review')$$,'admin inserts extracted product');
select ok(exists(select 1 from public.audit_logs where entity_type='brand_site_sources'),'site source creates audit log');

select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.brand_site_sources),1::bigint,'assigned AE reads source');
select is(public.review_brand_knowledge_fact('98000000-0000-4000-8000-000000000001','approved','agency review'),'98000000-0000-4000-8000-000000000001'::uuid,'AE reviews fact through RPC');
select is((select reviewed_by_role from public.brand_knowledge_facts where id='98000000-0000-4000-8000-000000000001'),'ae','AE role snapshot is preserved');

select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000003',true);
select is(public.review_brand_product('a8000000-0000-4000-8000-000000000001','approved','advertiser confirmation','{"name":"approved","official_url":"approved","description":"approved","price":"approved","inventory":"needs_review"}'::jsonb),'a8000000-0000-4000-8000-000000000001'::uuid,'advertiser reviews assigned product');
select ok((select advertiser_reviewed_at is not null and reviewed_by_role='advertiser' from public.brand_products where id='a8000000-0000-4000-8000-000000000001'),'advertiser confirmation is distinct');

select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000004',true);
select is((select count(*) from public.brand_site_sources),0::bigint,'unassigned AE cannot read source');
select throws_ok($$select public.review_brand_knowledge_fact('98000000-0000-4000-8000-000000000001','approved',null)$$,'42501','Knowledge review permission denied','unassigned AE cannot review fact');

select set_config('request.jwt.claim.sub','18000000-0000-4000-8000-000000000001',true);
select throws_ok($$insert into public.brand_site_sources(brand_id,base_url,platform_type,verification_status,verification_method,created_by,updated_by) values('38000000-0000-4000-8000-000000000001','https://example.com','custom','verified','dns-txt','18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001')$$,'23514',null,'verified source requires verification actor and timestamp');
select is((select count(*) from public.brand_knowledge_facts where brand_id='38000000-0000-4000-8000-000000000002'),0::bigint,'cross-brand fact data is absent and isolated');

select * from finish();
rollback;
