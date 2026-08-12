begin;
drop policy if exists account_status_self on public.user_account_statuses;
create policy account_status_scoped_select on public.user_account_statuses for select to authenticated using(
  user_id=(select auth.uid()) or exists(
    select 1 from public.brand_assignments target
    where target.user_id=user_account_statuses.user_id and (
      public.is_agency_admin(target.brand_id) or exists(select 1 from public.brand_assignments mine where mine.brand_id=target.brand_id and mine.user_id=(select auth.uid()) and mine.role='ae')
    )
  )
);
commit;
