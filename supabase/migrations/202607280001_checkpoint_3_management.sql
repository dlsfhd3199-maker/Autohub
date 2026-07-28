begin;

alter table public.brands
  add column publishing_path text not null default '/blog'
    check (publishing_path ~ '^/[a-z0-9/_-]*$'),
  add column archived_at timestamptz;

create index brands_active_agency_updated_idx
  on public.brands (agency_organization_id, updated_at desc)
  where archived_at is null;

create or replace function public.validate_brand_organizations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  agency_type public.organization_type;
  advertiser_type public.organization_type;
begin
  select type into agency_type from public.organizations where id = new.agency_organization_id;
  select type into advertiser_type from public.organizations where id = new.advertiser_organization_id;

  if agency_type is distinct from 'agency'::public.organization_type
    or advertiser_type is distinct from 'advertiser'::public.organization_type then
    raise exception 'Brand organizations must match agency and advertiser types'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger brands_validate_organizations
before insert or update of agency_organization_id, advertiser_organization_id
on public.brands
for each row execute function public.validate_brand_organizations();

create or replace function public.validate_brand_assignment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_is_valid boolean;
begin
  select exists (
    select 1
    from public.brands b
    join public.organization_memberships m
      on m.user_id = new.user_id
     and m.organization_id = case
       when new.role = 'ae'::public.brand_assignment_role then b.agency_organization_id
       else b.advertiser_organization_id
     end
    join public.profiles p on p.id = m.user_id and p.is_active
    where b.id = new.brand_id
      and (
        (new.role = 'ae'::public.brand_assignment_role and m.role = 'ae'::public.membership_role)
        or
        (new.role = 'advertiser'::public.brand_assignment_role and m.role = 'advertiser'::public.membership_role)
      )
  ) into assignment_is_valid;

  if not assignment_is_valid then
    raise exception 'Assignee must be an active member with a matching organization role'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger brand_assignments_validate_scope
before insert or update of brand_id, user_id, role
on public.brand_assignments
for each row execute function public.validate_brand_assignment_scope();

create policy profiles_select_organization_admin
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.organization_memberships member
    join public.organization_memberships administrator
      on administrator.organization_id = member.organization_id
     and administrator.user_id = (select auth.uid())
     and administrator.role = 'agency_admin'
    where member.user_id = profiles.id
  )
);

create policy profiles_select_managed_advertiser_members
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.organization_memberships member
    join public.brands b on b.advertiser_organization_id = member.organization_id
    where member.user_id = profiles.id
      and public.is_agency_admin(b.id)
  )
);

create policy memberships_select_managed_advertiser
on public.organization_memberships for select to authenticated
using (
  exists (
    select 1 from public.brands b
    where b.advertiser_organization_id = organization_memberships.organization_id
      and public.is_agency_admin(b.id)
  )
);

grant select, insert, update, delete on public.organizations, public.organization_memberships,
  public.brands, public.brand_assignments, public.content_items to service_role;

commit;
