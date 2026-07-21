begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@agency.example.com', '', '{"display_name":"가상 관리자"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ae@agency.example.com', '', '{"display_name":"가상 AE"}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'contact@alpha.example.com', '', '{"display_name":"가상 광고주 담당자"}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@beta.example.com', '', '{"display_name":"가상 타 브랜드 담당자"}', now(), now());

insert into public.organizations (id, name, type) values
  ('20000000-0000-0000-0000-000000000001', '가상 대행사', 'agency'),
  ('20000000-0000-0000-0000-000000000002', '가상 광고주 알파', 'advertiser'),
  ('20000000-0000-0000-0000-000000000003', '가상 광고주 베타', 'advertiser');

insert into public.organization_memberships (user_id, organization_id, role) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'agency_admin'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'ae'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'advertiser'),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'advertiser');

insert into public.brands (id, agency_organization_id, advertiser_organization_id, name, brand_key, domain) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '가상 브랜드 알파', 'virtual-alpha', 'alpha.example.com'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '가상 브랜드 베타', 'virtual-beta', 'beta.example.com');

insert into public.brand_assignments (brand_id, user_id, role) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'ae'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'advertiser'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'advertiser');

insert into public.content_items (id, brand_id, title, slug, owner_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '가상 알파 콘텐츠', 'virtual-alpha-content', '10000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '가상 베타 콘텐츠', 'virtual-beta-content', '10000000-0000-0000-0000-000000000001');

insert into public.content_versions (id, brand_id, content_id, version_no, status, created_by) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'approved', '10000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 2, 'draft', '10000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select ok(public.can_access_brand('30000000-0000-0000-0000-000000000001'), 'AE can access assigned brand');
select ok(not public.can_access_brand('30000000-0000-0000-0000-000000000002'), 'AE cannot access unassigned brand');
select is((select count(*) from public.brands), 1::bigint, 'AE sees only one assigned brand');
select is((select count(*) from public.content_items), 1::bigint, 'AE sees only assigned brand content');
select ok(public.can_edit_brand_content('30000000-0000-0000-0000-000000000001'), 'AE can edit assigned brand drafts');
select throws_ok(
  $$update public.content_versions set change_summary = '변경 시도' where id = '50000000-0000-0000-0000-000000000001'$$,
  '55000',
  'Approved content versions are immutable',
  'approved versions cannot be updated'
);
select lives_ok(
  $$update public.content_versions set change_summary = '가상 변경', revision = revision + 1 where id = '50000000-0000-0000-0000-000000000002'$$,
  'draft versions can be updated'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.content_items), 1::bigint, 'advertiser sees its assigned brand content');
select ok(not public.can_edit_brand_content('30000000-0000-0000-0000-000000000001'), 'advertiser cannot edit content');
select is(
  (select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'advertiser can read an approved version'
);
select is(
  (select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000002'),
  1::bigint,
  'advertiser can read an unapproved version in its own brand'
);

select * from finish();
rollback;
