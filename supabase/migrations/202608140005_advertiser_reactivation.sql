begin;

alter type public.account_status add value if not exists 'manual_cleanup_required';

create table public.advertiser_reactivation_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in (
    'reactivation_started','auth_unbanned','temporary_credential_rotated',
    'reactivation_completed','reactivation_compensation_succeeded','reactivation_compensation_failed'
  )),
  safe_error_code text check (safe_error_code is null or char_length(safe_error_code) <= 80),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.advertiser_reactivation_requests enable row level security;
create policy advertiser_reactivation_admin_select on public.advertiser_reactivation_requests
  for select to authenticated using (public.is_agency_admin(brand_id));

create or replace function public.record_advertiser_reactivation_event(
  request_id uuid,
  target_user_id uuid,
  target_brand_id uuid,
  target_status text,
  target_safe_error text default null
) returns text
language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := (select auth.uid());
  current_request public.advertiser_reactivation_requests%rowtype;
  current_status public.account_status;
begin
  if caller is null or not public.is_account_approved() or not public.is_agency_admin(target_brand_id) then
    raise exception 'Reactivation permission denied' using errcode='42501';
  end if;
  if not exists(select 1 from public.brand_assignments where brand_id=target_brand_id and user_id=target_user_id and role='advertiser') then
    raise exception 'Advertiser assignment not found' using errcode='P0002';
  end if;
  if target_status not in ('reactivation_started','auth_unbanned','temporary_credential_rotated','reactivation_completed','reactivation_compensation_succeeded','reactivation_compensation_failed') then
    raise exception 'Invalid reactivation event' using errcode='23514';
  end if;

  select * into current_request from public.advertiser_reactivation_requests where id=request_id for update;
  if current_request.id is null then
    if target_status <> 'reactivation_started' then raise exception 'Reactivation request not found' using errcode='P0002'; end if;
    select status into current_status from public.user_account_statuses where user_id=target_user_id for update;
    if current_status <> 'suspended' then raise exception 'Suspended advertiser required' using errcode='23514'; end if;
    insert into public.advertiser_reactivation_requests(id,user_id,brand_id,actor_id,status)
      values(request_id,target_user_id,target_brand_id,caller,target_status);
  else
    if current_request.actor_id<>caller or current_request.user_id<>target_user_id or current_request.brand_id<>target_brand_id then
      raise exception 'Reactivation request identity mismatch' using errcode='42501';
    end if;
    if current_request.status='reactivation_completed' then return current_request.status; end if;
    update public.advertiser_reactivation_requests set status=target_status,safe_error_code=target_safe_error,
      completed_at=case when target_status in('reactivation_completed','reactivation_compensation_succeeded','reactivation_compensation_failed') then now() else null end,
      updated_at=now() where id=request_id;
  end if;

  if target_status='reactivation_completed' then
    update public.user_account_statuses set status='approved',password_change_required=true,disabled_at=null,
      temporary_credential_issued_at=now(),reviewed_by=caller,reviewed_at=now(),safe_reason=null,updated_at=now()
      where user_id=target_user_id and status='suspended';
    if not found then raise exception 'Suspended advertiser required' using errcode='23514'; end if;
    update public.profiles set is_active=true where id=target_user_id;
  elsif target_status='reactivation_compensation_succeeded' then
    update public.user_account_statuses set status='suspended',password_change_required=false,disabled_at=coalesce(disabled_at,now()),updated_at=now()
      where user_id=target_user_id;
    update public.profiles set is_active=false where id=target_user_id;
  elsif target_status='reactivation_compensation_failed' then
    update public.user_account_statuses set status='manual_cleanup_required',password_change_required=true,safe_reason='수동 정리 필요',updated_at=now()
      where user_id=target_user_id;
    update public.profiles set is_active=false where id=target_user_id;
  end if;

  insert into public.audit_logs(organization_id,brand_id,actor_id,action,entity_type,entity_id,after_data)
    select b.agency_organization_id,b.id,caller,target_status,'profile',target_user_id,
      jsonb_strip_nulls(jsonb_build_object('status',target_status,'safe_error_code',target_safe_error))
    from public.brands b where b.id=target_brand_id;
  return target_status;
end $$;

revoke all on function public.record_advertiser_reactivation_event(uuid,uuid,uuid,text,text) from public;
grant execute on function public.record_advertiser_reactivation_event(uuid,uuid,uuid,text,text) to authenticated;
grant select on public.advertiser_reactivation_requests to authenticated;
grant select,insert,update,delete on public.advertiser_reactivation_requests to service_role;

commit;
