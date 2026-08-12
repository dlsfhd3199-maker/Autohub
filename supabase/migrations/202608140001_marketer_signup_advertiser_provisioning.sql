begin;

alter table public.membership_applications alter column organization_name drop not null;
alter table public.membership_applications alter column job_title drop not null;
alter table public.membership_applications alter column phone drop not null;

do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.membership_applications'::regclass and contype='c' and pg_get_constraintdef(oid) like '%requested_role%' loop
    execute format('alter table public.membership_applications drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.membership_applications add constraint membership_applications_marketer_only_check
  check(requested_role='ae' and brand_name is null and storefront_url is null and join_code_id is not null and requested_organization_id is not null) not valid;

alter table public.user_account_statuses
  add column password_change_required boolean not null default false,
  add column provisioning_method text not null default 'existing' check(provisioning_method in('existing','public_marketer_application','temporary_credentials','email_invitation')),
  add column created_by uuid references public.profiles(id) on delete restrict,
  add column temporary_credential_issued_at timestamptz,
  add column password_changed_at timestamptz,
  add column disabled_at timestamptz,
  add column display_job_title text check(display_job_title is null or char_length(display_job_title)<=100);

create table public.advertiser_credential_events(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete restrict, event_type text not null check(event_type in('issued','reissued','password_changed','disabled')),
  actor_id uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);

create or replace function public.is_account_approved() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_account_statuses s where s.user_id=(select auth.uid()) and s.status='approved' and not s.password_change_required)
$$;

create or replace function public.create_marketer_membership_application(target_code_hash text,target_name text,target_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare code public.organization_join_codes%rowtype; app_id uuid; auth_email text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select lower(email) into auth_email from auth.users where id=(select auth.uid());
  if auth_email is null or auth_email<>lower(trim(target_email)) then raise exception 'Application identity mismatch' using errcode='42501'; end if;
  select * into code from public.organization_join_codes where code_hash=target_code_hash and is_active and revoked_at is null and (expires_at is null or expires_at>now()) for share;
  if code.id is null then raise exception 'Invalid join code' using errcode='42501'; end if;
  insert into public.membership_applications(user_id,requested_role,organization_name,applicant_name,email_normalized,join_code_id,requested_organization_id,privacy_consent_at)
  select (select auth.uid()),'ae',o.name,trim(target_name),auth_email,code.id,code.organization_id,now() from public.organizations o where o.id=code.organization_id returning id into app_id;
  update public.user_account_statuses set status='pending',provisioning_method='public_marketer_application',updated_at=now() where user_id=(select auth.uid());
  return app_id;
end $$;

create or replace function public.finalize_advertiser_provisioning(target_user_id uuid,target_brand_id uuid,target_display_name text,target_job_title text default null,target_method text default 'temporary_credentials') returns uuid language plpgsql security definer set search_path='' as $$
declare b public.brands%rowtype; caller uuid:=(select auth.uid()); allowed boolean;
begin
  if not public.is_account_approved() or target_method not in('temporary_credentials','email_invitation') then raise exception 'Provisioning permission denied' using errcode='42501'; end if;
  select * into b from public.brands where id=target_brand_id and archived_at is null for share;
  if b.id is null then raise exception 'Brand not found' using errcode='P0002'; end if;
  allowed:=public.is_agency_admin(target_brand_id) or exists(select 1 from public.brand_assignments a where a.brand_id=target_brand_id and a.user_id=caller and a.role='ae');
  if not allowed then raise exception 'Provisioning permission denied' using errcode='42501'; end if;
  update public.profiles set display_name=trim(target_display_name),is_active=true where id=target_user_id;
  if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
  insert into public.organization_memberships(user_id,organization_id,role) values(target_user_id,b.advertiser_organization_id,'advertiser') on conflict do nothing;
  insert into public.brand_assignments(brand_id,user_id,role) values(target_brand_id,target_user_id,'advertiser') on conflict do nothing;
  insert into public.user_account_statuses(user_id,status,password_change_required,provisioning_method,created_by,temporary_credential_issued_at,disabled_at,display_job_title,updated_at)
  values(target_user_id,'approved',true,target_method,caller,now(),null,nullif(trim(target_job_title),''),now()) on conflict(user_id) do update set status='approved',password_change_required=true,provisioning_method=excluded.provisioning_method,created_by=caller,temporary_credential_issued_at=now(),disabled_at=null,display_job_title=excluded.display_job_title,updated_at=now();
  insert into public.advertiser_credential_events(user_id,brand_id,event_type,actor_id) values(target_user_id,target_brand_id,'issued',caller);
  insert into public.audit_logs(organization_id,brand_id,actor_id,action,entity_type,entity_id,after_data) values(b.agency_organization_id,b.id,caller,'advertiser_temporary_credentials_issued','profile',target_user_id,jsonb_build_object('method',target_method));
  return target_user_id;
end $$;

create or replace function public.mark_password_changed() returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid:=(select auth.uid()); brand uuid;
begin
  if target is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.user_account_statuses set password_change_required=false,password_changed_at=now(),updated_at=now() where user_id=target and status='approved';
  if not found then raise exception 'Account unavailable' using errcode='42501'; end if;
  select brand_id into brand from public.brand_assignments where user_id=target and role='advertiser' limit 1;
  if brand is not null then insert into public.advertiser_credential_events(user_id,brand_id,event_type,actor_id) values(target,brand,'password_changed',target); end if;
  return target;
end $$;

create or replace function public.review_membership_application(target_application_id uuid,target_decision text,target_brand_id uuid default null,target_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare app public.membership_applications%rowtype; admin_org uuid;
begin
  select m.organization_id into admin_org from public.organization_memberships m where m.user_id=(select auth.uid()) and m.role='agency_admin' limit 1;
  if admin_org is null or not public.is_account_approved() then raise exception 'Application review permission denied' using errcode='42501'; end if;
  select * into app from public.membership_applications where id=target_application_id and status='pending' for update;
  if app.id is null or app.requested_role<>'ae' then raise exception 'Pending marketer application not found' using errcode='P0002'; end if;
  if app.requested_organization_id<>admin_org then raise exception 'Application organization mismatch' using errcode='42501'; end if;
  if target_decision not in('approved','rejected') then raise exception 'Invalid review decision' using errcode='23514'; end if;
  if target_decision='approved' then
    if target_brand_id is null or not exists(select 1 from public.brands where id=target_brand_id and agency_organization_id=admin_org) then raise exception 'Valid assigned brand required' using errcode='23514'; end if;
    insert into public.organization_memberships(user_id,organization_id,role) values(app.user_id,admin_org,'ae') on conflict do nothing;
    insert into public.brand_assignments(brand_id,user_id,role) values(target_brand_id,app.user_id,'ae') on conflict do nothing;
  end if;
  update public.membership_applications set status=target_decision::public.account_status,reviewed_by=(select auth.uid()),reviewed_at=now(),safe_reason=target_reason,updated_at=now() where id=app.id;
  update public.user_account_statuses set status=target_decision::public.account_status,reviewed_by=(select auth.uid()),reviewed_at=now(),safe_reason=target_reason,updated_at=now() where user_id=app.user_id;
  insert into public.account_status_history(user_id,application_id,from_status,to_status,actor_id,safe_reason) values(app.user_id,app.id,'pending',target_decision::public.account_status,(select auth.uid()),target_reason);
  return app.id;
end $$;

drop policy if exists applications_self_insert on public.membership_applications;
create policy applications_self_insert on public.membership_applications for insert to authenticated with check(user_id=(select auth.uid()) and requested_role='ae' and status='pending');
alter table public.advertiser_credential_events enable row level security;
create policy credential_events_admin_select on public.advertiser_credential_events for select to authenticated using(public.is_agency_admin(brand_id));

revoke all on function public.create_marketer_membership_application(text,text,text),public.finalize_advertiser_provisioning(uuid,uuid,text,text,text),public.mark_password_changed() from public;
grant execute on function public.create_marketer_membership_application(text,text,text),public.finalize_advertiser_provisioning(uuid,uuid,text,text,text),public.mark_password_changed() to authenticated;
grant select on public.advertiser_credential_events to authenticated;
grant select,insert,update,delete on public.advertiser_credential_events to service_role;

commit;
