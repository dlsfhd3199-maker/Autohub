begin;

alter table public.user_account_statuses
  add column if not exists display_job_title text
  check (display_job_title is null or char_length(display_job_title) <= 100);

create or replace function public.reissue_advertiser_credentials(
  target_user_id uuid,
  target_brand_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target_assignment public.brand_assignments%rowtype;
begin
  if not public.is_account_approved() or not public.is_agency_admin(target_brand_id) then
    raise exception 'Credential reissue permission denied' using errcode = '42501';
  end if;

  select * into target_assignment
  from public.brand_assignments
  where brand_id = target_brand_id and user_id = target_user_id and role = 'advertiser'
  for share;
  if target_assignment.id is null then
    raise exception 'Advertiser assignment not found' using errcode = 'P0002';
  end if;

  update public.user_account_statuses
  set status = 'approved', password_change_required = true,
      temporary_credential_issued_at = now(), disabled_at = null, updated_at = now()
  where user_id = target_user_id and provisioning_method in ('temporary_credentials', 'email_invitation');
  if not found then raise exception 'Advertiser account not found' using errcode = 'P0002'; end if;

  insert into public.advertiser_credential_events(user_id, brand_id, event_type, actor_id)
  values (target_user_id, target_brand_id, 'reissued', caller);
  insert into public.audit_logs(organization_id, brand_id, actor_id, action, entity_type, entity_id, after_data)
  select b.agency_organization_id, b.id, caller, 'advertiser_temporary_credentials_reissued',
         'profile', target_user_id, jsonb_build_object('password_change_required', true)
  from public.brands b where b.id = target_brand_id;
  return target_user_id;
end $$;

create or replace function public.disable_advertiser_account(
  target_user_id uuid,
  target_brand_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare caller uuid := (select auth.uid());
begin
  if not public.is_account_approved() or not public.is_agency_admin(target_brand_id) then
    raise exception 'Account disable permission denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.brand_assignments
    where brand_id = target_brand_id and user_id = target_user_id and role = 'advertiser'
  ) then raise exception 'Advertiser assignment not found' using errcode = 'P0002'; end if;

  update public.user_account_statuses
  set status = 'suspended', disabled_at = now(), safe_reason = '관리자에 의해 비활성화됨', updated_at = now()
  where user_id = target_user_id;
  if not found then raise exception 'Advertiser account not found' using errcode = 'P0002'; end if;

  update public.profiles set is_active = false where id = target_user_id;
  insert into public.advertiser_credential_events(user_id, brand_id, event_type, actor_id)
  values (target_user_id, target_brand_id, 'disabled', caller);
  insert into public.audit_logs(organization_id, brand_id, actor_id, action, entity_type, entity_id, after_data)
  select b.agency_organization_id, b.id, caller, 'advertiser_account_disabled', 'profile', target_user_id,
         jsonb_build_object('status', 'suspended') from public.brands b where b.id = target_brand_id;
  return target_user_id;
end $$;

revoke all on function public.reissue_advertiser_credentials(uuid, uuid), public.disable_advertiser_account(uuid, uuid) from public;
grant execute on function public.reissue_advertiser_credentials(uuid, uuid), public.disable_advertiser_account(uuid, uuid) to authenticated;

commit;
