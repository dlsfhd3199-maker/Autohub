begin;

create table public.brand_site_sources (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  base_url text not null check (char_length(base_url) between 8 and 2048),
  allowed_domains jsonb not null default '[]'::jsonb check (jsonb_typeof(allowed_domains) = 'array'),
  platform_type text not null check (platform_type in ('local-test-store','cafe24','custom','unknown')),
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending','ready','crawling','succeeded','partial','failed','disabled')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','failed')),
  verification_method text check (verification_method is null or verification_method in ('local-test-exception','dns-txt','html-file','cafe24-oauth')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  sitemap_url text check (sitemap_url is null or char_length(sitemap_url) <= 2048),
  robots_result jsonb not null default '{}'::jsonb check (jsonb_typeof(robots_result) = 'object'),
  robots_checked_at timestamptz,
  collected_page_count integer not null default 0 check (collected_page_count between 0 and 10000),
  last_crawled_at timestamptz,
  last_succeeded_at timestamptz,
  safe_error_code text check (char_length(safe_error_code) <= 100),
  safe_error_message text check (char_length(safe_error_message) <= 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, id), unique (brand_id, base_url),
  check ((verification_status = 'verified') = (verified_at is not null and verified_by is not null and verification_method is not null))
);
create unique index brand_site_sources_primary_idx on public.brand_site_sources(brand_id) where is_primary and status <> 'disabled';
create index brand_site_sources_brand_status_idx on public.brand_site_sources(brand_id,status,updated_at desc);

create table public.crawl_runs (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  source_id uuid not null, requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in ('queued','running','completed','partial','failed','cancelled')),
  scope_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(scope_snapshot) = 'object'),
  limits_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(limits_snapshot) = 'object'),
  discovered_count integer not null default 0 check (discovered_count >= 0), collected_count integer not null default 0 check (collected_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0), failed_count integer not null default 0 check (failed_count >= 0), unchanged_count integer not null default 0 check (unchanged_count >= 0),
  safe_error_code text check (char_length(safe_error_code) <= 100), safe_error_message text check (char_length(safe_error_message) <= 500),
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  unique (brand_id,id), constraint crawl_runs_source_scope_fk foreign key (brand_id,source_id) references public.brand_site_sources(brand_id,id) on delete restrict
);
create unique index crawl_runs_one_active_idx on public.crawl_runs(source_id) where status in ('queued','running');
create index crawl_runs_brand_created_idx on public.crawl_runs(brand_id,created_at desc);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  source_id uuid not null, crawl_run_id uuid not null, source_url text not null check (char_length(source_url) <= 2048),
  final_url text not null check (char_length(final_url) <= 2048), canonical_url text check (canonical_url is null or char_length(canonical_url) <= 2048),
  page_type text not null check (page_type in ('home','about','category','product','faq','other')),
  classification_signals jsonb not null default '[]'::jsonb check (jsonb_typeof(classification_signals) = 'array'),
  http_status integer not null check (http_status between 100 and 599), content_type text not null check (char_length(content_type) <= 200),
  title text check (char_length(title) <= 500), meta_description text check (char_length(meta_description) <= 2000),
  extracted_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_metadata) = 'object' and pg_column_size(extracted_metadata) <= 262144),
  extracted_json_ld jsonb not null default '[]'::jsonb check (jsonb_typeof(extracted_json_ld) = 'array' and pg_column_size(extracted_json_ld) <= 262144),
  visible_text text not null default '' check (octet_length(visible_text) <= 524288),
  raw_html_snapshot text check (raw_html_snapshot is null or octet_length(raw_html_snapshot) <= 262144),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'), supersedes_document_id uuid references public.source_documents(id) on delete restrict,
  collected_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (brand_id,id), unique (source_id,final_url,content_hash),
  constraint source_documents_source_scope_fk foreign key (brand_id,source_id) references public.brand_site_sources(brand_id,id) on delete restrict,
  constraint source_documents_run_scope_fk foreign key (brand_id,crawl_run_id) references public.crawl_runs(brand_id,id) on delete restrict
);
create index source_documents_brand_url_idx on public.source_documents(brand_id,final_url,collected_at desc);

create table public.brand_knowledge_facts (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  source_document_id uuid not null, source_url text not null check (char_length(source_url) <= 2048),
  fact_type text not null check (char_length(fact_type) between 1 and 100), fact_key text not null check (char_length(fact_key) between 1 and 200),
  fact_value jsonb not null check (pg_column_size(fact_value) <= 65536), extraction_location jsonb not null default '{}'::jsonb check (jsonb_typeof(extraction_location) = 'object'),
  fact_hash text not null check (fact_hash ~ '^[a-f0-9]{64}$'), risk_level text not null default 'low' check (risk_level in ('low','price','efficacy','performance','numeric')),
  status text not null default 'discovered' check (status in ('discovered','needs_review','approved','rejected','stale')),
  reviewed_by uuid references public.profiles(id) on delete restrict, reviewed_by_role text check (reviewed_by_role is null or reviewed_by_role in ('agency_admin','ae','advertiser')),
  reviewed_at timestamptz, approval_note text check (char_length(approval_note) <= 1000),
  agency_reviewed_by uuid references public.profiles(id) on delete restrict, agency_reviewed_at timestamptz,
  advertiser_reviewed_by uuid references public.profiles(id) on delete restrict, advertiser_reviewed_at timestamptz,
  supersedes_fact_id uuid references public.brand_knowledge_facts(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id,id), unique (brand_id,fact_hash,source_document_id),
  constraint knowledge_facts_document_scope_fk foreign key (brand_id,source_document_id) references public.source_documents(brand_id,id) on delete restrict,
  check ((reviewed_by is null and reviewed_by_role is null and reviewed_at is null) or (reviewed_by is not null and reviewed_by_role is not null and reviewed_at is not null))
);
create index brand_knowledge_facts_review_idx on public.brand_knowledge_facts(brand_id,status,risk_level,updated_at desc);

create table public.brand_products (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  source_document_id uuid not null, product_key text not null check (char_length(product_key) between 1 and 300),
  name text not null check (char_length(name) between 1 and 300), official_url text not null check (char_length(official_url) <= 2048),
  description text check (char_length(description) <= 20000), price numeric(14,2), currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  inventory_status text check (inventory_status is null or char_length(inventory_status) <= 100), rating numeric(4,2), review_count integer check (review_count is null or review_count >= 0),
  image_url text check (image_url is null or char_length(image_url) <= 2048), image_alt text check (image_alt is null or char_length(image_alt) <= 500),
  product_hash text not null check (product_hash ~ '^[a-f0-9]{64}$'),
  field_review_status jsonb not null default '{"name":"needs_review","official_url":"needs_review","description":"needs_review","price":"needs_review","inventory":"needs_review"}'::jsonb check (jsonb_typeof(field_review_status) = 'object'),
  status text not null default 'discovered' check (status in ('discovered','needs_review','approved','rejected','stale')),
  reviewed_by uuid references public.profiles(id) on delete restrict, reviewed_by_role text check (reviewed_by_role is null or reviewed_by_role in ('agency_admin','ae','advertiser')),
  reviewed_at timestamptz, approval_note text check (char_length(approval_note) <= 1000),
  agency_reviewed_by uuid references public.profiles(id) on delete restrict, agency_reviewed_at timestamptz,
  advertiser_reviewed_by uuid references public.profiles(id) on delete restrict, advertiser_reviewed_at timestamptz,
  supersedes_product_id uuid references public.brand_products(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id,id), unique (brand_id,product_key,product_hash),
  constraint brand_products_document_scope_fk foreign key (brand_id,source_document_id) references public.source_documents(brand_id,id) on delete restrict,
  check ((reviewed_by is null and reviewed_by_role is null and reviewed_at is null) or (reviewed_by is not null and reviewed_by_role is not null and reviewed_at is not null))
);
create index brand_products_review_idx on public.brand_products(brand_id,status,product_key,updated_at desc);

create or replace function public.brand_review_role(target_brand_id uuid) returns text language sql stable security definer set search_path='' as $$
  select case when public.is_agency_admin(target_brand_id) then 'agency_admin'
    when exists(select 1 from public.brand_assignments a where a.brand_id=target_brand_id and a.user_id=(select auth.uid()) and a.role='ae') then 'ae'
    when exists(select 1 from public.brand_assignments a where a.brand_id=target_brand_id and a.user_id=(select auth.uid()) and a.role='advertiser') then 'advertiser'
    else null end
$$;
create or replace function public.can_review_brand_knowledge(target_brand_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.brand_review_role(target_brand_id) is not null
$$;

create or replace function public.review_brand_knowledge_fact(target_fact_id uuid,target_status text,target_note text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.brand_knowledge_facts%rowtype; reviewer_role text;
begin
  select * into item from public.brand_knowledge_facts where id=target_fact_id for update;
  reviewer_role:=public.brand_review_role(item.brand_id);
  if item.id is null or reviewer_role is null then raise exception 'Knowledge review permission denied' using errcode='42501'; end if;
  if target_status not in ('approved','rejected') then raise exception 'Invalid knowledge review transition' using errcode='23514'; end if;
  update public.brand_knowledge_facts set status=target_status,reviewed_by=(select auth.uid()),reviewed_by_role=reviewer_role,reviewed_at=now(),approval_note=target_note,
    agency_reviewed_by=case when reviewer_role in ('agency_admin','ae') then (select auth.uid()) else agency_reviewed_by end,
    agency_reviewed_at=case when reviewer_role in ('agency_admin','ae') then now() else agency_reviewed_at end,
    advertiser_reviewed_by=case when reviewer_role='advertiser' then (select auth.uid()) else advertiser_reviewed_by end,
    advertiser_reviewed_at=case when reviewer_role='advertiser' then now() else advertiser_reviewed_at end where id=item.id;
  return item.id;
end $$;

create or replace function public.review_brand_product(target_product_id uuid,target_status text,target_note text default null,target_field_status jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.brand_products%rowtype; reviewer_role text;
begin
  select * into item from public.brand_products where id=target_product_id for update;
  reviewer_role:=public.brand_review_role(item.brand_id);
  if item.id is null or reviewer_role is null then raise exception 'Product review permission denied' using errcode='42501'; end if;
  if target_status not in ('approved','rejected') then raise exception 'Invalid product review transition' using errcode='23514'; end if;
  if target_field_status is not null and jsonb_typeof(target_field_status)<>'object' then raise exception 'Invalid field review status' using errcode='23514'; end if;
  update public.brand_products set status=target_status,field_review_status=coalesce(target_field_status,field_review_status),reviewed_by=(select auth.uid()),reviewed_by_role=reviewer_role,reviewed_at=now(),approval_note=target_note,
    agency_reviewed_by=case when reviewer_role in ('agency_admin','ae') then (select auth.uid()) else agency_reviewed_by end,
    agency_reviewed_at=case when reviewer_role in ('agency_admin','ae') then now() else agency_reviewed_at end,
    advertiser_reviewed_by=case when reviewer_role='advertiser' then (select auth.uid()) else advertiser_reviewed_by end,
    advertiser_reviewed_at=case when reviewer_role='advertiser' then now() else advertiser_reviewed_at end where id=item.id;
  return item.id;
end $$;

create or replace function public.protect_source_document_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare source_platform text;
begin
  if new.raw_html_snapshot is not null then select platform_type into source_platform from public.brand_site_sources where id=new.source_id and brand_id=new.brand_id;
    if source_platform is distinct from 'local-test-store' then raise exception 'Raw HTML snapshots are restricted to the local test store' using errcode='23514'; end if;
  end if; return new;
end $$;
create trigger source_documents_snapshot_guard before insert or update of raw_html_snapshot on public.source_documents for each row execute function public.protect_source_document_snapshot();

create trigger brand_site_sources_updated_at before update on public.brand_site_sources for each row execute function public.set_updated_at();
create trigger brand_knowledge_facts_updated_at before update on public.brand_knowledge_facts for each row execute function public.set_updated_at();
create trigger brand_products_updated_at before update on public.brand_products for each row execute function public.set_updated_at();
create trigger brand_site_sources_audit after insert or update on public.brand_site_sources for each row execute function public.write_scoped_audit_log();
create trigger crawl_runs_audit after insert or update on public.crawl_runs for each row execute function public.write_scoped_audit_log();
create trigger source_documents_audit after insert or update on public.source_documents for each row execute function public.write_scoped_audit_log();
create trigger brand_knowledge_facts_audit after insert or update on public.brand_knowledge_facts for each row execute function public.write_scoped_audit_log();
create trigger brand_products_audit after insert or update on public.brand_products for each row execute function public.write_scoped_audit_log();

alter table public.brand_site_sources enable row level security; alter table public.crawl_runs enable row level security; alter table public.source_documents enable row level security;
alter table public.brand_knowledge_facts enable row level security; alter table public.brand_products enable row level security;
create policy site_sources_select on public.brand_site_sources for select to authenticated using (public.can_access_brand(brand_id));
create policy site_sources_admin_insert on public.brand_site_sources for insert to authenticated with check (public.is_agency_admin(brand_id) and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy site_sources_admin_update on public.brand_site_sources for update to authenticated using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id) and updated_by=(select auth.uid()));
create policy crawl_runs_select on public.crawl_runs for select to authenticated using (public.can_access_brand(brand_id));
create policy crawl_runs_admin_insert on public.crawl_runs for insert to authenticated with check (public.is_agency_admin(brand_id) and requested_by=(select auth.uid()));
create policy crawl_runs_admin_update on public.crawl_runs for update to authenticated using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id));
create policy source_documents_select on public.source_documents for select to authenticated using (public.can_access_brand(brand_id));
create policy source_documents_admin_insert on public.source_documents for insert to authenticated with check (public.is_agency_admin(brand_id));
create policy source_documents_admin_update on public.source_documents for update to authenticated using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id));
create policy knowledge_facts_select on public.brand_knowledge_facts for select to authenticated using (public.can_access_brand(brand_id));
create policy knowledge_facts_admin_insert on public.brand_knowledge_facts for insert to authenticated with check (public.is_agency_admin(brand_id));
create policy products_select on public.brand_products for select to authenticated using (public.can_access_brand(brand_id));
create policy products_admin_insert on public.brand_products for insert to authenticated with check (public.is_agency_admin(brand_id));

grant select,insert,update on public.brand_site_sources,public.crawl_runs,public.source_documents to authenticated;
grant select,insert on public.brand_knowledge_facts,public.brand_products to authenticated;
revoke all on function public.brand_review_role(uuid),public.can_review_brand_knowledge(uuid),public.review_brand_knowledge_fact(uuid,text,text),public.review_brand_product(uuid,text,text,jsonb),public.protect_source_document_snapshot() from public;
grant execute on function public.brand_review_role(uuid),public.can_review_brand_knowledge(uuid),public.review_brand_knowledge_fact(uuid,text,text),public.review_brand_product(uuid,text,text,jsonb) to authenticated;

commit;
