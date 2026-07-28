begin;

create or replace function public.can_access_brand(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_agency_admin(target_brand_id)
    or exists (
      select 1 from public.brand_assignments a
      where a.brand_id = target_brand_id and a.user_id = (select auth.uid())
    );
$$;

drop policy content_items_select on public.content_items;
create policy content_items_select on public.content_items for select to authenticated
using (
  public.can_access_brand(brand_id)
  and exists (select 1 from public.brands b where b.id = brand_id and b.archived_at is null)
);

drop policy content_versions_select on public.content_versions;
create policy content_versions_select on public.content_versions for select to authenticated
using (
  public.can_access_brand(brand_id)
  and exists (select 1 from public.brands b where b.id = brand_id and b.archived_at is null)
);

create or replace function public.can_edit_brand_content(target_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brands b
    where b.id = target_brand_id
      and b.archived_at is null
      and (
        public.is_agency_admin(b.id)
        or exists (
          select 1 from public.brand_assignments a
          where a.brand_id = b.id
            and a.user_id = (select auth.uid())
            and a.role = 'ae'
        )
      )
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.write_scoped_audit_log() from public;
revoke all on function public.protect_approved_content_version() from public;
revoke all on function public.validate_brand_organizations() from public;
revoke all on function public.validate_brand_assignment_scope() from public;

commit;
