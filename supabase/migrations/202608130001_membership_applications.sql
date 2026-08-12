begin;

create type public.account_status as enum ('pending','approved','rejected','suspended','withdrawn');
create type public.application_role as enum ('ae','advertiser');

create table public.user_account_statuses (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  status public.account_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  safe_reason text check (safe_reason is null or char_length(safe_reason) <= 500),
  updated_at timestamptz not null default now()
);

insert into public.user_account_statuses(user_id,status)
select id,'approved' from public.profiles on conflict do nothing;

create table public.organization_join_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  label text not null check (char_length(label) between 1 and 100),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  requested_role public.application_role not null,
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  brand_name text check (brand_name is null or char_length(brand_name) between 2 and 160),
  storefront_url text check (storefront_url is null or char_length(storefront_url) <= 2048),
  applicant_name text not null check (char_length(applicant_name) between 2 and 100),
  job_title text not null check (char_length(job_title) between 1 and 100),
  phone text not null check (char_length(phone) between 8 and 30),
  email_normalized text not null check (email_normalized = lower(email_normalized) and char_length(email_normalized) <= 320),
  joined_on date,
  join_code_id uuid references public.organization_join_codes(id) on delete restrict,
  requested_organization_id uuid references public.organizations(id) on delete restrict,
  status public.account_status not null default 'pending' check (status in ('pending','approved','rejected')),
  privacy_consent_at timestamptz not null,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  safe_reason text check (safe_reason is null or char_length(safe_reason) <= 500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((requested_role='advertiser' and brand_name is not null and storefront_url is not null and join_code_id is null)
      or (requested_role='ae' and brand_name is null and storefront_url is null and join_code_id is not null and requested_organization_id is not null))
);

create table public.account_status_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete restrict,
  application_id uuid references public.membership_applications(id) on delete restrict,
  from_status public.account_status, to_status public.account_status not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  safe_reason text check (safe_reason is null or char_length(safe_reason) <= 500), created_at timestamptz not null default now()
);

create or replace function public.create_pending_account_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.user_account_statuses(user_id,status) values(new.id,case when session_user='postgres' then 'approved'::public.account_status else 'pending'::public.account_status end) on conflict do nothing; return new;
end $$;
create trigger profiles_create_pending_status after insert on public.profiles for each row execute function public.create_pending_account_status();

create or replace function public.is_account_approved() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_account_statuses s where s.user_id=(select auth.uid()) and s.status='approved')
$$;

create or replace function public.is_agency_admin(target_brand_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_account_approved() and exists(select 1 from public.brands b join public.organization_memberships m on m.organization_id=b.agency_organization_id where b.id=target_brand_id and m.user_id=(select auth.uid()) and m.role='agency_admin')
$$;
create or replace function public.is_organization_member(target_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_account_approved() and exists(select 1 from public.organization_memberships m where m.organization_id=target_organization_id and m.user_id=(select auth.uid()))
$$;
create or replace function public.is_organization_admin(target_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_account_approved() and exists(select 1 from public.organization_memberships m where m.organization_id=target_organization_id and m.user_id=(select auth.uid()) and m.role='agency_admin')
$$;
create or replace function public.can_access_brand(target_brand_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_account_approved() and (public.is_agency_admin(target_brand_id) or exists(select 1 from public.brand_assignments a where a.brand_id=target_brand_id and a.user_id=(select auth.uid())))
$$;
create or replace function public.can_edit_brand_content(target_brand_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_account_approved() and exists(
    select 1 from public.brands b where b.id=target_brand_id and b.archived_at is null and
      (public.is_agency_admin(b.id) or exists(select 1 from public.brand_assignments a where a.brand_id=b.id and a.user_id=(select auth.uid()) and a.role='ae'))
  )
$$;
create or replace function public.can_configure_brand(target_brand_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.can_edit_brand_content(target_brand_id) $$;

create or replace function public.resolve_join_code(target_hash text) returns table(code_id uuid, organization_id uuid) language sql stable security definer set search_path='' as $$
  select c.id,c.organization_id from public.organization_join_codes c where c.code_hash=target_hash and c.is_active and c.revoked_at is null and (c.expires_at is null or c.expires_at>now()) limit 1
$$;

create or replace function public.is_valid_join_code(target_hash text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_join_codes c where c.code_hash=target_hash and c.is_active and c.revoked_at is null and (c.expires_at is null or c.expires_at>now()))
$$;

create or replace function public.review_membership_application(target_application_id uuid,target_decision text,target_brand_id uuid default null,target_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare app public.membership_applications%rowtype; admin_org uuid; advertiser_org uuid; created_brand uuid;
begin
  select m.organization_id into admin_org from public.organization_memberships m where m.user_id=(select auth.uid()) and m.role='agency_admin' limit 1;
  if admin_org is null or not public.is_account_approved() then raise exception 'Application review permission denied' using errcode='42501'; end if;
  select * into app from public.membership_applications where id=target_application_id and status='pending' for update;
  if app.id is null then raise exception 'Pending application not found' using errcode='P0002'; end if;
  if target_decision not in ('approved','rejected') then raise exception 'Invalid review decision' using errcode='23514'; end if;
  if app.requested_role='ae' and app.requested_organization_id<>admin_org then raise exception 'Application organization mismatch' using errcode='42501'; end if;
  if target_decision='approved' then
    if app.requested_role='ae' then
      insert into public.organization_memberships(user_id,organization_id,role) values(app.user_id,admin_org,'ae') on conflict do nothing;
      if target_brand_id is null or not exists(select 1 from public.brands where id=target_brand_id and agency_organization_id=admin_org) then raise exception 'Valid assigned brand required' using errcode='23514'; end if;
      insert into public.brand_assignments(brand_id,user_id,role) values(target_brand_id,app.user_id,'ae') on conflict do nothing;
    else
      if target_brand_id is not null then
        select advertiser_organization_id into advertiser_org from public.brands where id=target_brand_id and agency_organization_id=admin_org;
        if advertiser_org is null then raise exception 'Valid advertiser brand required' using errcode='23514'; end if;
      else
        insert into public.organizations(name,type) values(app.organization_name,'advertiser') returning id into advertiser_org;
        insert into public.brands(agency_organization_id,advertiser_organization_id,name,brand_key,domain,publishing_path)
          values(admin_org,advertiser_org,app.brand_name,'virtual-'||substr(replace(app.id::text,'-',''),1,12),lower(split_part(regexp_replace(app.storefront_url,'^https?://','','i'),'/',1)),'/blog') returning id into created_brand;
        target_brand_id:=created_brand;
      end if;
      insert into public.organization_memberships(user_id,organization_id,role) values(app.user_id,advertiser_org,'advertiser') on conflict do nothing;
      insert into public.brand_assignments(brand_id,user_id,role) values(target_brand_id,app.user_id,'advertiser') on conflict do nothing;
    end if;
  end if;
  update public.membership_applications set status=target_decision::public.account_status,reviewed_by=(select auth.uid()),reviewed_at=now(),safe_reason=target_reason,updated_at=now() where id=app.id;
  update public.user_account_statuses set status=target_decision::public.account_status,reviewed_by=(select auth.uid()),reviewed_at=now(),safe_reason=target_reason,updated_at=now() where user_id=app.user_id;
  insert into public.account_status_history(user_id,application_id,from_status,to_status,actor_id,safe_reason) values(app.user_id,app.id,'pending',target_decision::public.account_status,(select auth.uid()),target_reason);
  return app.id;
end $$;

create or replace function public.set_account_status(target_user_id uuid,target_status text,target_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare old_status public.account_status;
begin
  if not public.is_account_approved() or not exists(select 1 from public.organization_memberships where user_id=(select auth.uid()) and role='agency_admin') then raise exception 'Account management permission denied' using errcode='42501'; end if;
  if target_status not in ('approved','suspended','withdrawn') then raise exception 'Invalid account status' using errcode='23514'; end if;
  select status into old_status from public.user_account_statuses where user_id=target_user_id for update;
  if old_status is null then raise exception 'Account not found' using errcode='P0002'; end if;
  update public.user_account_statuses set status=target_status::public.account_status,reviewed_by=(select auth.uid()),reviewed_at=now(),safe_reason=target_reason,updated_at=now() where user_id=target_user_id;
  insert into public.account_status_history(user_id,from_status,to_status,actor_id,safe_reason) values(target_user_id,old_status,target_status::public.account_status,(select auth.uid()),target_reason);
  return target_user_id;
end $$;

create or replace function public.rotate_local_test_publishing_connection(target_brand_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare raw_key text;
begin
  if not public.can_configure_brand(target_brand_id) then raise exception 'Connection management permission denied' using errcode='42501'; end if;
  raw_key := 'ahp_' || rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'+/','-_'),'=');
  insert into public.publishing_connections(brand_id,provider,status,connection_status,bearer_key_hash,created_by,connected_by,granted_capabilities,disabled_at)
  values(target_brand_id,'local-test-store','active','connected',encode(extensions.digest(raw_key,'sha256'),'hex'),(select auth.uid()),(select auth.uid()),'["publish","update","inspect","targets"]'::jsonb,null)
  on conflict(brand_id,provider) do update set status='active',connection_status='connected',bearer_key_hash=excluded.bearer_key_hash,connected_by=(select auth.uid()),granted_capabilities=excluded.granted_capabilities,disabled_at=null;
  return raw_key;
end $$;

create or replace function public.disable_local_test_publishing_connection(target_brand_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.can_configure_brand(target_brand_id) then raise exception 'Connection management permission denied' using errcode='42501'; end if;
  update public.publishing_connections set status='disabled',connection_status='disabled',disabled_at=now() where brand_id=target_brand_id and provider='local-test-store';
  if not found then raise exception 'Connection not found' using errcode='P0002'; end if;
  return target_brand_id;
end $$;

alter table public.user_account_statuses enable row level security; alter table public.organization_join_codes enable row level security;
alter table public.membership_applications enable row level security; alter table public.account_status_history enable row level security;
create policy account_status_self on public.user_account_statuses for select to authenticated using(user_id=(select auth.uid()) or (public.is_account_approved() and exists(select 1 from public.organization_memberships m where m.user_id=(select auth.uid()) and m.role='agency_admin')));
create policy applications_self_insert on public.membership_applications for insert to authenticated with check(user_id=(select auth.uid()) and requested_role in ('ae','advertiser') and status='pending');
create policy applications_self_or_admin_select on public.membership_applications for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.organization_memberships m where m.user_id=(select auth.uid()) and m.role='agency_admin'));
create policy codes_admin_all on public.organization_join_codes for all to authenticated using(public.is_organization_admin(organization_id)) with check(public.is_organization_admin(organization_id));
create policy history_admin_select on public.account_status_history for select to authenticated using(exists(select 1 from public.organization_memberships m where m.user_id=(select auth.uid()) and m.role='agency_admin'));

drop policy if exists site_sources_admin_insert on public.brand_site_sources;
drop policy if exists site_sources_admin_update on public.brand_site_sources;
create policy site_sources_editor_insert on public.brand_site_sources for insert to authenticated with check (public.can_configure_brand(brand_id) and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy site_sources_editor_update on public.brand_site_sources for update to authenticated using (public.can_configure_brand(brand_id)) with check (public.can_configure_brand(brand_id) and updated_by=(select auth.uid()));
drop policy if exists crawl_runs_admin_insert on public.crawl_runs;
drop policy if exists crawl_runs_admin_update on public.crawl_runs;
create policy crawl_runs_editor_insert on public.crawl_runs for insert to authenticated with check (public.can_configure_brand(brand_id) and requested_by=(select auth.uid()));
create policy crawl_runs_editor_update on public.crawl_runs for update to authenticated using (public.can_configure_brand(brand_id)) with check (public.can_configure_brand(brand_id));
drop policy if exists source_documents_admin_insert on public.source_documents;
drop policy if exists source_documents_admin_update on public.source_documents;
create policy source_documents_editor_insert on public.source_documents for insert to authenticated with check (public.can_configure_brand(brand_id));
create policy source_documents_editor_update on public.source_documents for update to authenticated using (public.can_configure_brand(brand_id)) with check (public.can_configure_brand(brand_id));
drop policy if exists knowledge_facts_admin_insert on public.brand_knowledge_facts;
create policy knowledge_facts_editor_insert on public.brand_knowledge_facts for insert to authenticated with check (public.can_configure_brand(brand_id));
drop policy if exists products_admin_insert on public.brand_products;
create policy products_editor_insert on public.brand_products for insert to authenticated with check (public.can_configure_brand(brand_id));

revoke all on function public.is_account_approved(),public.can_configure_brand(uuid),public.is_valid_join_code(text),public.resolve_join_code(text),public.review_membership_application(uuid,text,uuid,text),public.set_account_status(uuid,text,text),public.rotate_local_test_publishing_connection(uuid),public.disable_local_test_publishing_connection(uuid) from public;
grant execute on function public.is_account_approved(),public.can_configure_brand(uuid) to authenticated;
grant execute on function public.resolve_join_code(text) to authenticated;
grant execute on function public.is_valid_join_code(text) to anon,authenticated;
grant execute on function public.review_membership_application(uuid,text,uuid,text) to authenticated;
grant execute on function public.set_account_status(uuid,text,text) to authenticated;
grant execute on function public.rotate_local_test_publishing_connection(uuid),public.disable_local_test_publishing_connection(uuid) to authenticated;
grant select on public.user_account_statuses,public.membership_applications,public.account_status_history to authenticated;
grant insert on public.membership_applications to authenticated;
grant select,insert,update on public.organization_join_codes to authenticated;
grant select,insert,update,delete on public.user_account_statuses,public.organization_join_codes,public.membership_applications,public.account_status_history to service_role;

commit;
