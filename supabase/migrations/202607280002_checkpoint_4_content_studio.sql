begin;

alter table public.content_items
  add column primary_keyword text not null default '' check (char_length(primary_keyword) <= 120),
  add column current_draft_id uuid;

alter table public.content_versions
  alter column body_json set default '{"schemaVersion":1,"blocks":[],"metadata":{"primaryKeyword":"","keywords":[],"description":""}}'::jsonb;

alter table public.content_versions
  add column is_working_draft boolean not null default false,
  add column title_snapshot text not null default '' check (char_length(title_snapshot) <= 160),
  add column document_schema_version integer not null default 1 check (document_schema_version = 1),
  add column saved_at timestamptz not null default now(),
  add constraint content_versions_body_document_check check (
    jsonb_typeof(body_json) = 'object'
    and body_json ? 'schemaVersion'
    and body_json ? 'blocks'
    and body_json ? 'metadata'
    and pg_column_size(body_json) <= 524288
  );

alter table public.content_items
  add constraint content_items_current_draft_fk
  foreign key (id, current_draft_id)
  references public.content_versions(content_id, id)
  deferrable initially deferred;

create unique index content_versions_one_working_draft_idx
  on public.content_versions(content_id)
  where is_working_draft;
create index content_versions_history_idx
  on public.content_versions(content_id, version_no desc)
  where not is_working_draft;

create or replace function public.protect_approved_content_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'approved' or not old.is_working_draft then
    raise exception 'Immutable content versions cannot be changed'
      using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.create_content_with_draft(
  target_brand_id uuid,
  content_title text,
  content_slug text,
  keyword text,
  document jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_content_id uuid := gen_random_uuid();
  new_draft_id uuid := gen_random_uuid();
begin
  if not public.can_edit_brand_content(target_brand_id) then
    raise exception 'Content edit permission denied' using errcode = '42501';
  end if;
  insert into public.content_items (id, brand_id, title, slug, owner_id, primary_keyword)
  values (new_content_id, target_brand_id, content_title, content_slug, (select auth.uid()), keyword);
  insert into public.content_versions (id, brand_id, content_id, version_no, status, body_json, created_by, is_working_draft, title_snapshot, document_schema_version)
  values (new_draft_id, target_brand_id, new_content_id, 1, 'draft', document, (select auth.uid()), true, content_title, 1);
  update public.content_items set current_draft_id = new_draft_id where id = new_content_id;
  return jsonb_build_object('contentId', new_content_id, 'draftId', new_draft_id, 'revision', 1);
end;
$$;

create or replace function public.save_content_draft(
  target_content_id uuid,
  expected_revision integer,
  content_title text,
  keyword text,
  document jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.content_items%rowtype;
  saved public.content_versions%rowtype;
  latest public.content_versions%rowtype;
begin
  select * into target from public.content_items where id = target_content_id;
  if target.id is null or not public.can_edit_brand_content(target.brand_id) then
    raise exception 'Content edit permission denied' using errcode = '42501';
  end if;
  update public.content_versions set
    body_json = document,
    title_snapshot = content_title,
    document_schema_version = (document ->> 'schemaVersion')::integer,
    revision = revision + 1,
    saved_at = now()
  where id = target.current_draft_id
    and content_id = target.id
    and is_working_draft
    and status <> 'approved'
    and revision = expected_revision
  returning * into saved;
  if saved.id is null then
    select * into latest from public.content_versions where id = target.current_draft_id;
    return jsonb_build_object('ok', false, 'conflict', true, 'revision', latest.revision, 'title', latest.title_snapshot, 'document', latest.body_json, 'savedAt', latest.saved_at);
  end if;
  update public.content_items set title = content_title, primary_keyword = keyword where id = target.id;
  return jsonb_build_object('ok', true, 'conflict', false, 'revision', saved.revision, 'savedAt', saved.saved_at);
end;
$$;

create or replace function public.create_content_version(target_content_id uuid, summary text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.content_items%rowtype;
  draft public.content_versions%rowtype;
  new_draft_id uuid := gen_random_uuid();
begin
  select * into target from public.content_items where id = target_content_id for update;
  if target.id is null or not public.can_edit_brand_content(target.brand_id) then raise exception 'Content edit permission denied' using errcode = '42501'; end if;
  select * into draft from public.content_versions where id = target.current_draft_id for update;
  update public.content_versions set is_working_draft = false, change_summary = summary where id = draft.id;
  insert into public.content_versions (id, brand_id, content_id, version_no, status, body_json, revision, created_by, is_working_draft, title_snapshot, document_schema_version, saved_at)
  values (new_draft_id, draft.brand_id, draft.content_id, draft.version_no + 1, 'draft', draft.body_json, 1, (select auth.uid()), true, draft.title_snapshot, draft.document_schema_version, now());
  update public.content_items set current_version_id = draft.id, current_draft_id = new_draft_id where id = target.id;
  return jsonb_build_object('versionId', draft.id, 'versionNo', draft.version_no, 'draftId', new_draft_id, 'revision', 1);
end; $$;

create or replace function public.restore_content_version(target_content_id uuid, source_version_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.content_items%rowtype;
  source public.content_versions%rowtype;
  draft public.content_versions%rowtype;
  new_draft_id uuid := gen_random_uuid();
  next_no integer;
begin
  select * into target from public.content_items where id = target_content_id for update;
  if target.id is null or not public.can_edit_brand_content(target.brand_id) then raise exception 'Content edit permission denied' using errcode = '42501'; end if;
  select * into source from public.content_versions where id = source_version_id and content_id = target.id and not is_working_draft;
  if source.id is null then raise exception 'Source version not found' using errcode = '22023'; end if;
  select * into draft from public.content_versions where id = target.current_draft_id for update;
  update public.content_versions set is_working_draft = false, change_summary = 'Superseded by restored draft' where id = draft.id;
  select coalesce(max(version_no), 0) + 1 into next_no from public.content_versions where content_id = target.id;
  insert into public.content_versions (id, brand_id, content_id, version_no, status, body_json, revision, created_by, is_working_draft, title_snapshot, document_schema_version, saved_at)
  values (new_draft_id, source.brand_id, source.content_id, next_no, 'draft', source.body_json, 1, (select auth.uid()), true, source.title_snapshot, source.document_schema_version, now());
  update public.content_items set current_draft_id = new_draft_id, title = source.title_snapshot where id = target.id;
  return jsonb_build_object('draftId', new_draft_id, 'revision', 1, 'versionNo', next_no);
end; $$;

revoke all on function public.create_content_with_draft(uuid,text,text,text,jsonb) from public;
revoke all on function public.save_content_draft(uuid,integer,text,text,jsonb) from public;
revoke all on function public.create_content_version(uuid,text) from public;
revoke all on function public.restore_content_version(uuid,uuid) from public;
grant execute on function public.create_content_with_draft(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.save_content_draft(uuid,integer,text,text,jsonb) to authenticated;
grant execute on function public.create_content_version(uuid,text) to authenticated;
grant execute on function public.restore_content_version(uuid,uuid) to authenticated;
grant select, insert, update, delete on public.content_versions to service_role;

commit;
