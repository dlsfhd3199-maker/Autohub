begin;

create extension if not exists pgcrypto;

create type public.organization_type as enum ('agency', 'advertiser');
create type public.membership_role as enum ('agency_admin', 'ae', 'advertiser');
create type public.brand_assignment_role as enum ('ae', 'advertiser');
create type public.content_status as enum ('draft', 'review_requested', 'client_review', 'approved', 'scheduled', 'published', 'needs_update', 'archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.organization_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, role)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  agency_organization_id uuid not null references public.organizations(id) on delete restrict,
  advertiser_organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  brand_key text not null check (brand_key ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  domain text not null check (domain ~ '^[a-z0-9.-]+$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_organization_id, brand_key),
  unique (agency_organization_id, id)
);

create table public.brand_assignments (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.brand_assignment_role not null,
  created_at timestamptz not null default now(),
  unique (brand_id, user_id, role)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,159}$'),
  status public.content_status not null default 'draft',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (brand_id, slug),
  unique (brand_id, id)
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  content_id uuid not null,
  version_no integer not null check (version_no > 0),
  status public.content_status not null default 'draft',
  body_json jsonb not null default '{"blocks":[]}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  change_summary text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint content_versions_content_scope_fk
    foreign key (brand_id, content_id)
    references public.content_items(brand_id, id)
    on delete restrict,
  unique (content_id, version_no),
  unique (content_id, id)
);

alter table public.content_items
  add constraint content_items_current_version_fk
  foreign key (id, current_version_id)
  references public.content_versions(content_id, id)
  deferrable initially deferred;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index organization_memberships_user_idx on public.organization_memberships(user_id, organization_id);
create index brand_assignments_user_idx on public.brand_assignments(user_id, brand_id);
create index brands_agency_idx on public.brands(agency_organization_id, id);
create index brands_advertiser_idx on public.brands(advertiser_organization_id, id);
create index content_items_brand_status_idx on public.content_items(brand_id, status, updated_at desc);
create index content_items_brand_title_idx on public.content_items(brand_id, lower(title));
create index content_versions_content_idx on public.content_versions(content_id, version_no desc);
create index audit_logs_brand_created_idx on public.audit_logs(brand_id, created_at desc);

create or replace function public.is_agency_admin(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brands b
    join public.organization_memberships m
      on m.organization_id = b.agency_organization_id
    where b.id = target_brand_id
      and m.user_id = (select auth.uid())
      and m.role = 'agency_admin'
  );
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'agency_admin'
  );
$$;

create or replace function public.can_access_brand(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_agency_admin(target_brand_id)
    or exists (
      select 1
      from public.brand_assignments a
      where a.brand_id = target_brand_id
        and a.user_id = (select auth.uid())
    );
$$;

create or replace function public.can_edit_brand_content(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_agency_admin(target_brand_id)
    or exists (
      select 1
      from public.brand_assignments a
      where a.brand_id = target_brand_id
        and a.user_id = (select auth.uid())
        and a.role = 'ae'
    );
$$;

revoke all on function public.is_agency_admin(uuid) from public;
revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_admin(uuid) from public;
revoke all on function public.can_access_brand(uuid) from public;
revoke all on function public.can_edit_brand_content(uuid) from public;
grant execute on function public.is_agency_admin(uuid) to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.can_access_brand(uuid) to authenticated;
grant execute on function public.can_edit_brand_content(uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), '신규 사용자')
  );
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.write_scoped_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scoped_brand_id uuid;
  scoped_organization_id uuid;
  scoped_entity_id uuid;
  scoped_row jsonb;
begin
  scoped_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  scoped_entity_id := (scoped_row ->> 'id')::uuid;
  scoped_brand_id := case
    when tg_table_name = 'brands' then scoped_entity_id
    else (scoped_row ->> 'brand_id')::uuid
  end;

  select b.agency_organization_id into scoped_organization_id
  from public.brands b where b.id = scoped_brand_id;

  insert into public.audit_logs (
    organization_id, brand_id, actor_id, action, entity_type,
    entity_id, before_data, after_data
  ) values (
    scoped_organization_id,
    scoped_brand_id,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    scoped_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.protect_approved_content_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'approved' then
    raise exception 'Approved content versions are immutable'
      using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands
for each row execute function public.set_updated_at();
create trigger content_items_updated_at before update on public.content_items
for each row execute function public.set_updated_at();
create trigger content_versions_updated_at before update on public.content_versions
for each row execute function public.set_updated_at();
create trigger content_versions_approved_immutable
before update or delete on public.content_versions
for each row execute function public.protect_approved_content_version();
create trigger brands_audit after insert or update on public.brands
for each row execute function public.write_scoped_audit_log();
create trigger brand_assignments_audit after insert or update or delete on public.brand_assignments
for each row execute function public.write_scoped_audit_log();
create trigger content_items_audit after insert or update on public.content_items
for each row execute function public.write_scoped_audit_log();
create trigger content_versions_audit after insert or update or delete on public.content_versions
for each row execute function public.write_scoped_audit_log();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.brands enable row level security;
alter table public.brand_assignments enable row level security;
alter table public.content_items enable row level security;
alter table public.content_versions enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (
  public.is_organization_member(id)
  or exists (
    select 1 from public.brands b
    where b.advertiser_organization_id = organizations.id and public.is_agency_admin(b.id)
  )
);

create policy profiles_select_self_or_shared_brand on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.brand_assignments mine
    join public.brand_assignments theirs on theirs.brand_id = mine.brand_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
  or exists (
    select 1 from public.brand_assignments theirs
    where theirs.user_id = profiles.id and public.is_agency_admin(theirs.brand_id)
  )
);

create policy memberships_select on public.organization_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_organization_admin(organization_id)
);

create policy brands_select on public.brands for select to authenticated
using (public.can_access_brand(id));
create policy brands_insert on public.brands for insert to authenticated
with check (
  exists (
    select 1 from public.organization_memberships m
    where m.organization_id = agency_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'agency_admin'
  )
);
create policy brands_update on public.brands for update to authenticated
using (public.is_agency_admin(id)) with check (public.is_agency_admin(id));

create policy assignments_select on public.brand_assignments for select to authenticated
using (public.can_access_brand(brand_id));
create policy assignments_insert on public.brand_assignments for insert to authenticated
with check (public.is_agency_admin(brand_id));
create policy assignments_update on public.brand_assignments for update to authenticated
using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id));
create policy assignments_delete on public.brand_assignments for delete to authenticated
using (public.is_agency_admin(brand_id));

create policy content_items_select on public.content_items for select to authenticated
using (public.can_access_brand(brand_id));
create policy content_items_insert on public.content_items for insert to authenticated
with check (public.can_edit_brand_content(brand_id));
create policy content_items_update on public.content_items for update to authenticated
using (public.can_edit_brand_content(brand_id)) with check (public.can_edit_brand_content(brand_id));

create policy content_versions_select on public.content_versions for select to authenticated
using (public.can_access_brand(brand_id));
create policy content_versions_insert on public.content_versions for insert to authenticated
with check (public.can_edit_brand_content(brand_id));
create policy content_versions_update on public.content_versions for update to authenticated
using (public.can_edit_brand_content(brand_id) and status <> 'approved')
with check (public.can_edit_brand_content(brand_id));
create policy content_versions_delete on public.content_versions for delete to authenticated
using (public.can_edit_brand_content(brand_id) and status <> 'approved');

create policy audit_logs_select on public.audit_logs for select to authenticated
using (brand_id is not null and public.is_agency_admin(brand_id));
create policy audit_logs_insert on public.audit_logs for insert to authenticated
with check (actor_id = (select auth.uid()) and brand_id is not null and public.can_access_brand(brand_id));

grant usage on schema public to authenticated;
grant select on public.organizations, public.profiles, public.organization_memberships,
  public.brands, public.brand_assignments, public.content_items, public.content_versions,
  public.audit_logs to authenticated;
grant insert, update on public.brands to authenticated;
grant insert, update, delete on public.brand_assignments to authenticated;
grant insert, update on public.content_items to authenticated;
grant insert, update, delete on public.content_versions to authenticated;
grant insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

commit;
