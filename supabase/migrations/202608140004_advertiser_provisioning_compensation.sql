begin;
create table public.advertiser_provisioning_requests(
 id uuid primary key, actor_id uuid not null references public.profiles(id), brand_id uuid not null references public.brands(id),
 email_hash text not null check(char_length(email_hash)=64), auth_user_id uuid references public.profiles(id),
 status text not null check(status in('provisioning_started','auth_user_created','assignment_completed','compensation_succeeded','compensation_failed')),
 safe_error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.advertiser_provisioning_requests enable row level security;
create policy provisioning_scoped_select on public.advertiser_provisioning_requests for select to authenticated using(actor_id=(select auth.uid()) or public.is_agency_admin(brand_id));
create or replace function public.record_advertiser_provisioning_event(request_id uuid,target_brand_id uuid,target_email_hash text,target_status text,target_auth_user_id uuid default null,target_safe_error text default null) returns text language plpgsql security definer set search_path='' as $$
declare caller uuid:=(select auth.uid()); current public.advertiser_provisioning_requests%rowtype;
begin
 if not public.is_account_approved() or not(public.is_agency_admin(target_brand_id) or exists(select 1 from public.brand_assignments where brand_id=target_brand_id and user_id=caller and role='ae')) then raise exception 'Provisioning permission denied' using errcode='42501'; end if;
 if target_status not in('provisioning_started','auth_user_created','assignment_completed','compensation_succeeded','compensation_failed') or char_length(target_email_hash)<>64 then raise exception 'Invalid provisioning event' using errcode='23514'; end if;
 select * into current from public.advertiser_provisioning_requests where id=request_id for update;
 if current.id is null then
  if target_status<>'provisioning_started' then raise exception 'Provisioning request not found' using errcode='P0002'; end if;
  insert into public.advertiser_provisioning_requests(id,actor_id,brand_id,email_hash,status) values(request_id,caller,target_brand_id,target_email_hash,target_status);
 else
  if current.actor_id<>caller or current.brand_id<>target_brand_id or current.email_hash<>target_email_hash then raise exception 'Provisioning request mismatch' using errcode='42501'; end if;
  if current.status='assignment_completed' then return current.status; end if;
  update public.advertiser_provisioning_requests set status=target_status,auth_user_id=coalesce(target_auth_user_id,auth_user_id),safe_error_code=target_safe_error,updated_at=now() where id=request_id;
 end if;
 insert into public.audit_logs(organization_id,brand_id,actor_id,action,entity_type,entity_id,after_data) select agency_organization_id,id,caller,target_status,'advertiser_provisioning_request',request_id,jsonb_strip_nulls(jsonb_build_object('safe_error_code',target_safe_error)) from public.brands where id=target_brand_id;
 return target_status;
end $$;
revoke all on function public.record_advertiser_provisioning_event(uuid,uuid,text,text,uuid,text) from public;
grant execute on function public.record_advertiser_provisioning_event(uuid,uuid,text,text,uuid,text) to authenticated;
grant select on public.advertiser_provisioning_requests to authenticated;
grant all on public.advertiser_provisioning_requests to service_role;
commit;
