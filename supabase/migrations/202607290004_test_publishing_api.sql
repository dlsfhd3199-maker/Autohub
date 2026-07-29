begin;

alter table public.generation_jobs
  add column generation_provider text not null default 'fake'
  check (generation_provider in ('fake','openai'));

alter table public.publishing_connections
  add column updated_at timestamptz not null default now();

create trigger publishing_connections_updated_at
before update on public.publishing_connections
for each row execute function public.set_updated_at();

create or replace function public.test_publish_content(target_content_id uuid, target_version_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.content_items%rowtype;
  target_version public.content_versions%rowtype;
  first_published_at timestamptz;
begin
  select * into target from public.content_items where id = target_content_id for update;
  if target.id is null or not public.is_agency_admin(target.brand_id) then
    raise exception 'Test publication requires agency administrator permission' using errcode = '42501';
  end if;

  select * into target_version
  from public.content_versions
  where id = target_version_id
    and content_id = target.id
    and brand_id = target.brand_id
    and not is_working_draft;
  if target_version.id is null then
    raise exception 'Test publication requires an immutable explicit version' using errcode = '23514';
  end if;

  first_published_at := coalesce(target.published_at, now());
  update public.content_items
  set published_version_id = target_version.id,
      published_at = first_published_at,
      publication_updated_at = now(),
      status = 'published'
  where id = target.id;

  return jsonb_build_object(
    'contentId', target.id,
    'versionId', target_version.id,
    'versionNo', target_version.version_no,
    'publishedAt', first_published_at,
    'publicationUpdatedAt', now()
  );
end;
$$;

create or replace function public.get_test_published_content_list(target_brand_key text, supplied_bearer_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_brand public.brands%rowtype;
  items jsonb;
begin
  if target_brand_key is null or target_brand_key !~ '^[a-z0-9][a-z0-9-]{0,62}$'
     or supplied_bearer_hash is null or supplied_bearer_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select b.* into target_brand
  from public.brands b
  join public.publishing_connections pc on pc.brand_id = b.id
  where b.brand_key = target_brand_key
    and b.archived_at is null
    and pc.status = 'active'
    and pc.disabled_at is null
    and pc.bearer_key_hash = supplied_bearer_hash;
  if target_brand.id is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', v.title_snapshot,
    'primaryKeyword', c.primary_keyword,
    'status', 'test_published',
    'publishedAt', c.published_at,
    'updatedAt', c.publication_updated_at,
    'versionId', v.id,
    'versionNo', v.version_no,
    'document', v.body_json
  ) order by c.publication_updated_at desc), '[]'::jsonb) into items
  from public.content_items c
  join public.content_versions v
    on v.id = c.published_version_id
   and v.content_id = c.id
   and v.brand_id = c.brand_id
   and not v.is_working_draft
  where c.brand_id = target_brand.id
    and c.archived_at is null
    and c.published_version_id is not null;

  return jsonb_build_object(
    'brand', jsonb_build_object('key', target_brand.brand_key, 'name', target_brand.name, 'domain', target_brand.domain),
    'items', items
  );
end;
$$;

create or replace function public.get_test_published_content_detail(target_brand_key text, target_slug text, supplied_bearer_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  list_result jsonb;
  selected_item jsonb;
begin
  if target_slug is null or target_slug !~ '^[a-z0-9][a-z0-9-]{0,159}$' then return null; end if;
  list_result := public.get_test_published_content_list(target_brand_key, supplied_bearer_hash);
  if list_result is null then return null; end if;
  select item into selected_item
  from jsonb_array_elements(list_result -> 'items') item
  where item ->> 'slug' = target_slug
  limit 1;
  return jsonb_build_object('brand', list_result -> 'brand', 'item', selected_item);
end;
$$;

revoke all on function public.test_publish_content(uuid,uuid) from public;
revoke all on function public.get_test_published_content_list(text,text) from public;
revoke all on function public.get_test_published_content_detail(text,text,text) from public;
grant execute on function public.test_publish_content(uuid,uuid) to authenticated;
grant execute on function public.get_test_published_content_list(text,text) to anon;
grant execute on function public.get_test_published_content_detail(text,text,text) to anon;

commit;
