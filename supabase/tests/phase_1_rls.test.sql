begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@agency.example.com', '', '{"display_name":"Virtual Admin"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ae@agency.example.com', '', '{"display_name":"Virtual AE"}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'contact@alpha.example.com', '', '{"display_name":"Virtual Advertiser Alpha"}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'contact@beta.example.com', '', '{"display_name":"Virtual Advertiser Beta"}', now(), now());

insert into public.organizations (id, name, type) values
  ('20000000-0000-0000-0000-000000000001', 'Virtual Agency One', 'agency'),
  ('20000000-0000-0000-0000-000000000002', 'Virtual Advertiser Alpha', 'advertiser'),
  ('20000000-0000-0000-0000-000000000003', 'Virtual Advertiser Beta', 'advertiser'),
  ('20000000-0000-0000-0000-000000000004', 'Virtual Agency Two', 'agency');

insert into public.organization_memberships (user_id, organization_id, role) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'agency_admin'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'ae'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'advertiser'),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'advertiser');

insert into public.brands (id, agency_organization_id, advertiser_organization_id, name, brand_key, domain) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Virtual Brand Alpha', 'virtual-alpha', 'alpha.example.com'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Virtual Brand Beta', 'virtual-beta', 'beta.example.com'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'Virtual Brand Gamma', 'virtual-gamma', 'gamma.example.com');

insert into public.brand_assignments (brand_id, user_id, role) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'ae'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'advertiser'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'advertiser');

insert into public.content_items (id, brand_id, title, slug, owner_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Virtual Alpha Content', 'virtual-alpha-content', '10000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Virtual Beta Content', 'virtual-beta-content', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Virtual Gamma Content', 'virtual-gamma-content', '10000000-0000-0000-0000-000000000001');

insert into public.content_versions (id, brand_id, content_id, version_no, status, change_summary, created_by) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'approved', 'Approved fixture', '10000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 2, 'draft', 'Draft fixture', '10000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 1, 'draft', 'Other brand fixture', '10000000-0000-0000-0000-000000000001');

select throws_ok(
  $$insert into public.content_versions (id, brand_id, content_id, version_no, status, created_by) values ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 3, 'draft', '10000000-0000-0000-0000-000000000001')$$,
  '23503',
  'insert or update on table "content_versions" violates foreign key constraint "content_versions_content_scope_fk"',
  'cross-brand content and version links are rejected'
);
select throws_ok(
  $$update public.content_versions set change_summary = 'Forbidden privileged update' where id = '50000000-0000-0000-0000-000000000001'$$,
  '55000',
  'Approved content versions are immutable',
  'approved version update is blocked by database trigger'
);
select throws_ok(
  $$delete from public.content_versions where id = '50000000-0000-0000-0000-000000000001'$$,
  '55000',
  'Approved content versions are immutable',
  'approved version delete is blocked by database trigger'
);
select is((select count(*) from auth.users where email !~ '^[^@]+@([^.]+\.)*example\.com$'), 0::bigint, 'all fixture email addresses use example.com');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.brands), 2::bigint, 'agency admin sees brands in own organization only');
select is((select count(*) from public.content_items), 2::bigint, 'agency admin sees content in own organization only');
select ok(not public.can_access_brand('30000000-0000-0000-0000-000000000003'), 'agency admin cannot access another organization brand by id');
select ok((select count(*) > 0 from public.audit_logs), 'audit logs are generated and visible to agency admin');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select ok(public.can_access_brand('30000000-0000-0000-0000-000000000001'), 'AE can access assigned brand');
select ok(not public.can_access_brand('30000000-0000-0000-0000-000000000002'), 'AE cannot access unassigned brand');
select is((select count(*) from public.brands), 1::bigint, 'AE sees only one assigned brand');
select is((select count(*) from public.brands where id = '30000000-0000-0000-0000-000000000002'), 0::bigint, 'AE direct brand id lookup is blocked');
select is((select count(*) from public.content_items where id = '40000000-0000-0000-0000-000000000002'), 0::bigint, 'AE direct content id lookup is blocked');
select is((select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000003'), 0::bigint, 'AE direct version id lookup is blocked');
select ok(public.can_edit_brand_content('30000000-0000-0000-0000-000000000001'), 'AE can edit assigned brand drafts');
select is_empty(
  $$update public.content_versions set change_summary = 'Forbidden AE update' where id = '50000000-0000-0000-0000-000000000001' returning id$$,
  'AE direct update of an approved version affects no rows through RLS'
);
select is_empty(
  $$delete from public.content_versions where id = '50000000-0000-0000-0000-000000000001' returning id$$,
  'AE direct delete of an approved version affects no rows through RLS'
);
select lives_ok(
  $$update public.content_versions set change_summary = 'Virtual draft change', revision = revision + 1 where id = '50000000-0000-0000-0000-000000000002'$$,
  'draft versions can be updated by assigned AE'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.brands), 1::bigint, 'advertiser sees its assigned brand');
select is((select count(*) from public.content_items), 1::bigint, 'advertiser sees its assigned brand content');
select is((select count(*) from public.content_items where id = '40000000-0000-0000-0000-000000000002'), 0::bigint, 'advertiser direct foreign content id lookup is blocked');
select ok(not public.can_edit_brand_content('30000000-0000-0000-0000-000000000001'), 'advertiser cannot edit content');
select lives_ok(
  $$update public.content_versions set change_summary = 'Advertiser edit attempt' where id = '50000000-0000-0000-0000-000000000002'$$,
  'advertiser update is denied without leaking an error'
);
select is(
  (select change_summary from public.content_versions where id = '50000000-0000-0000-0000-000000000002'),
  'Virtual draft change',
  'advertiser update changes no data'
);
select is((select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000001'), 1::bigint, 'advertiser can read approved version');
select is((select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000002'), 1::bigint, 'advertiser can read unapproved version in own brand');
select is((select count(*) from public.content_versions where id = '50000000-0000-0000-0000-000000000003'), 0::bigint, 'advertiser cannot read another brand version');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select ok(
  exists (
    select 1 from public.audit_logs
    where actor_id = '10000000-0000-0000-0000-000000000002'
      and brand_id = '30000000-0000-0000-0000-000000000001'
      and entity_type = 'content_versions'
      and action = 'update'
  ),
  'audit log records the assigned AE draft update'
);

select * from finish();
rollback;
