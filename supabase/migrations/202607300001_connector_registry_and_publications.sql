begin;

alter table public.publishing_connections drop constraint publishing_connections_brand_id_key;
alter table public.publishing_connections
  add column provider text not null default 'local-test-store' check (provider in ('local-test-store','html-export','cafe24','custom-api')),
  add column connection_status text not null default 'connected' check (connection_status in ('not_configured','connected','error','disabled','not_installed')),
  add column external_account_id text check (char_length(external_account_id) <= 200),
  add column public_domain text check (char_length(public_domain) <= 253),
  add column credential_reference text check (credential_reference is null or (char_length(credential_reference) <= 500 and credential_reference !~* '(bearer|token|secret|password|api[_-]?key)=')),
  add column granted_capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(granted_capabilities) = 'array'),
  add column default_publishing_target jsonb not null default '{}'::jsonb check (jsonb_typeof(default_publishing_target) = 'object'),
  add column last_verified_at timestamptz,
  add column connected_by uuid references public.profiles(id) on delete restrict;
alter table public.publishing_connections alter column bearer_key_hash drop not null;
update public.publishing_connections set provider='local-test-store', connection_status=case when status='active' then 'connected' else 'disabled' end, connected_by=created_by;
alter table public.publishing_connections add constraint publishing_connections_brand_provider_key unique (brand_id,provider);
alter table public.publishing_connections add constraint publishing_connections_brand_id_id_key unique (brand_id,id);
alter table public.publishing_connections add constraint publishing_connections_local_key_required check ((provider='local-test-store' and bearer_key_hash is not null) or (provider<>'local-test-store' and bearer_key_hash is null));
create index publishing_connections_brand_status_idx on public.publishing_connections(brand_id,connection_status);

create or replace function public.sync_publishing_connection_status() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then new.status := case when new.connection_status='disabled' then 'disabled' else 'active' end;
  elsif new.connection_status is distinct from old.connection_status and new.status is not distinct from old.status then new.status := case when new.connection_status='disabled' then 'disabled' else 'active' end;
  elsif new.status is distinct from old.status then new.connection_status := case when new.status='disabled' then 'disabled' else 'connected' end;
  end if;
  if new.connection_status='disabled' then new.disabled_at:=coalesce(new.disabled_at,now()); elsif new.connection_status='connected' then new.disabled_at:=null; end if;
  return new;
end $$;
create trigger publishing_connections_sync_status before insert or update of status,connection_status on public.publishing_connections for each row execute function public.sync_publishing_connection_status();

create table public.publication_records (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  connection_id uuid not null references public.publishing_connections(id) on delete restrict,
  content_id uuid not null, version_id uuid not null, publishing_target text not null check (char_length(publishing_target) between 1 and 200),
  request_idempotency_key uuid not null, status text not null check (status in ('pending','published','updated','failed','unpublished')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'), external_publication_id text check (char_length(external_publication_id) <= 300),
  external_url text check (char_length(external_url) <= 2048), safe_error_code text check (char_length(safe_error_code) <= 100),
  published_at timestamptz, last_synced_at timestamptz, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint publication_records_content_scope_fk foreign key (brand_id,content_id) references public.content_items(brand_id,id) on delete restrict,
  constraint publication_records_version_scope_fk foreign key (content_id,version_id) references public.content_versions(content_id,id) on delete restrict,
  constraint publication_records_connection_scope_fk foreign key (brand_id,connection_id) references public.publishing_connections(brand_id,id) on delete restrict,
  constraint publication_records_request_idempotency unique (connection_id,publishing_target,request_idempotency_key),
  constraint publication_records_version_target_once unique (connection_id,publishing_target,version_id)
);
create index publication_records_brand_updated_idx on public.publication_records(brand_id,updated_at desc);
create trigger publication_records_updated_at before update on public.publication_records for each row execute function public.set_updated_at();
create trigger publication_records_audit after insert or update on public.publication_records for each row execute function public.write_scoped_audit_log();
alter table public.publication_records enable row level security;
create policy publication_records_select on public.publication_records for select to authenticated using (public.can_access_brand(brand_id));
create policy publication_records_admin_insert on public.publication_records for insert to authenticated with check (public.is_agency_admin(brand_id) and created_by=(select auth.uid()));
create policy publication_records_admin_update on public.publication_records for update to authenticated using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id));
grant select,insert,update on public.publication_records to authenticated;
grant select,insert,update,delete on public.publication_records to service_role;

create or replace function public.get_publishing_connection_summaries(target_brand_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.can_access_brand(target_brand_id) then raise exception 'Brand access denied' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',pc.id,'provider',pc.provider,'status',pc.connection_status,'publicDomain',pc.public_domain,'capabilities',pc.granted_capabilities,'defaultTarget',pc.default_publishing_target,'lastVerifiedAt',pc.last_verified_at,'disabledAt',pc.disabled_at) order by pc.provider),'[]'::jsonb) into result
  from public.publishing_connections pc where pc.brand_id=target_brand_id;
  return result;
end $$;
revoke all on function public.get_publishing_connection_summaries(uuid) from public;
grant execute on function public.get_publishing_connection_summaries(uuid) to authenticated;

create or replace function public.record_test_publication(target_connection_id uuid,target_content_id uuid,target_version_id uuid,target text,request_key uuid,document_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare connection public.publishing_connections%rowtype; existing public.publication_records%rowtype; target_version public.content_versions%rowtype;
begin
  select * into connection from public.publishing_connections where id=target_connection_id for update;
  if connection.id is null or not public.is_agency_admin(connection.brand_id) then raise exception 'Publication permission denied' using errcode='42501'; end if;
  if connection.connection_status<>'connected' or connection.disabled_at is not null then raise exception 'Publishing connection disabled' using errcode='55000'; end if;
  select * into target_version from public.content_versions where id=target_version_id and content_id=target_content_id and brand_id=connection.brand_id and not is_working_draft;
  if target_version.id is null then raise exception 'Explicit immutable version required' using errcode='23514'; end if;
  select * into existing from public.publication_records where connection_id=connection.id and publishing_target=target and request_idempotency_key=request_key;
  if existing.id is not null then return jsonb_build_object('recordId',existing.id,'replayed',true,'versionId',existing.version_id); end if;
  select * into existing from public.publication_records where connection_id=connection.id and publishing_target=target and version_id=target_version.id;
  if existing.id is not null then return jsonb_build_object('recordId',existing.id,'replayed',true,'versionId',existing.version_id); end if;
  insert into public.publication_records(brand_id,connection_id,content_id,version_id,publishing_target,request_idempotency_key,status,content_hash,created_by,published_at,last_synced_at)
  values(connection.brand_id,connection.id,target_content_id,target_version.id,target,request_key,'published',document_hash,(select auth.uid()),now(),now()) returning * into existing;
  return jsonb_build_object('recordId',existing.id,'replayed',false,'versionId',existing.version_id);
end $$;
revoke all on function public.record_test_publication(uuid,uuid,uuid,text,uuid,text) from public;
grant execute on function public.record_test_publication(uuid,uuid,uuid,text,uuid,text) to authenticated;

-- Preserve the legacy local storefront pointer while publication_records becomes the platform-specific source of truth.
create or replace function public.get_test_publishing_connection_status(target_brand_key text,supplied_bearer_hash text) returns text language sql stable security definer set search_path='' as $$
 select case when pc.bearer_key_hash<>supplied_bearer_hash then 'unauthorized' when pc.connection_status='disabled' or pc.disabled_at is not null then 'disabled' else 'active' end
 from public.brands b join public.publishing_connections pc on pc.brand_id=b.id
 where b.brand_key=target_brand_key and b.archived_at is null and pc.provider='local-test-store'
 union all select 'unauthorized' limit 1
$$;

commit;
