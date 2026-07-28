begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_column('public', 'brands', 'publishing_path', 'brands have a publishing path');
select has_column('public', 'brands', 'archived_at', 'brands support archival');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@example.com', '', '{"display_name":"Virtual Admin A"}', now(), now()),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@example.com', '', '{"display_name":"Virtual Admin B"}', now(), now()),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@example.com', '', '{"display_name":"담당자 A"}', now(), now()),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@example.com', '', '{"display_name":"담당자 B"}', now(), now()),
  ('11000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'advertiser-a@example.com', '', '{"display_name":"가상 광고주 A"}', now(), now()),
  ('11000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'advertiser-b@example.com', '', '{"display_name":"가상 광고주 B"}', now(), now());

insert into public.organizations (id, name, type) values
  ('21000000-0000-0000-0000-000000000001', 'Virtual Agency A', 'agency'),
  ('21000000-0000-0000-0000-000000000002', 'Virtual Agency B', 'agency'),
  ('21000000-0000-0000-0000-000000000003', 'Virtual Advertiser A', 'advertiser'),
  ('21000000-0000-0000-0000-000000000004', 'Virtual Advertiser B', 'advertiser');

insert into public.organization_memberships (user_id, organization_id, role) values
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'agency_admin'),
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'agency_admin'),
  ('11000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', 'ae'),
  ('11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', 'ae'),
  ('11000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000003', 'advertiser'),
  ('11000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000004', 'advertiser');

insert into public.brands (id, agency_organization_id, advertiser_organization_id, name, brand_key, domain, publishing_path, archived_at) values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'Virtual Lumi', 'virtual-lumi', 'lumi.example.com', '/blog', null),
  ('31000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'Virtual Paw', 'virtual-paw', 'paw.example.com', '/content', now()),
  ('31000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000004', 'Virtual Bridge', 'virtual-bridge', 'bridge.example.com', '/journal', null);

insert into public.content_items (id, brand_id, title, slug, status, owner_id) values
  ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Virtual Lumi Guide', 'virtual-lumi-guide', 'draft', '11000000-0000-0000-0000-000000000003'),
  ('41000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000003', 'Virtual Bridge Guide', 'virtual-bridge-guide', 'approved', '11000000-0000-0000-0000-000000000004');

select throws_ok(
  $$insert into public.brands (agency_organization_id, advertiser_organization_id, name, brand_key, domain) values ('21000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', 'Virtual Invalid', 'virtual-invalid', 'invalid.example.com')$$,
  '23514', 'Brand organizations must match agency and advertiser types', 'brand organization types are enforced'
);
select throws_ok(
  $$insert into public.brand_assignments (brand_id, user_id, role) values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'ae')$$,
  '23514', 'Assignee must be an active member with a matching organization role', 'cross-organization AE assignment is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.brands), 2::bigint, 'admin sees only own agency brands');
select lives_ok($$update public.brands set publishing_path = '/insights' where id = '31000000-0000-0000-0000-000000000001'$$, 'admin updates own brand');
select is_empty($$update public.brands set name = 'Forbidden' where id = '31000000-0000-0000-0000-000000000003' returning id$$, 'admin cannot update another agency brand by id');
select lives_ok($$insert into public.brands (id, agency_organization_id, advertiser_organization_id, name, brand_key, domain) values ('31000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'Virtual Orbit', 'virtual-orbit', 'orbit.example.com')$$, 'admin creates a brand in own agency');
select lives_ok($$insert into public.brand_assignments (brand_id, user_id, role) values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'ae')$$, 'admin assigns same-organization AE');
select throws_ok($$insert into public.brand_assignments (brand_id, user_id, role) values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'ae')$$, '23514', 'Assignee must be an active member with a matching organization role', 'admin cannot assign another organization user');
select lives_ok($$insert into public.brand_assignments (brand_id, user_id, role) values ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'advertiser')$$, 'admin assigns advertiser from linked organization');
select ok(exists(select 1 from public.audit_logs where actor_id = '11000000-0000-0000-0000-000000000001' and entity_type = 'brand_assignments' and action = 'insert'), 'assignment change creates audit log');
select is((select count(*) from public.brands where archived_at is null), 2::bigint, 'normal active list condition excludes archived brand');

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.brands), 1::bigint, 'AE sees assigned brand only');
select is((select count(*) from public.brands where id = '31000000-0000-0000-0000-000000000003'), 0::bigint, 'AE direct unassigned brand lookup is blocked');
select is((select count(*) from public.content_items), 1::bigint, 'AE sees content from assigned brand only');

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.brands), 1::bigint, 'advertiser sees assigned brand only');
select is_empty($$update public.content_items set title = 'Forbidden advertiser change' where id = '41000000-0000-0000-0000-000000000001' returning id$$, 'advertiser cannot update content');
select is((select count(*) from public.content_items where id = '41000000-0000-0000-0000-000000000002'), 0::bigint, 'advertiser direct foreign content lookup is blocked');

select * from finish();
rollback;
