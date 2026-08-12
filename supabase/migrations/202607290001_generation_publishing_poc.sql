begin;

create table public.brand_knowledge_profiles (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null unique references public.brands(id) on delete restrict,
  introduction text not null default '' check (char_length(introduction) <= 5000), target_audience text not null default '' check (char_length(target_audience) <= 2000),
  tone text not null default '' check (char_length(tone) <= 1000), prohibited_expressions jsonb not null default '[]'::jsonb check (jsonb_typeof(prohibited_expressions) = 'array'),
  default_cta jsonb not null default '{"label":"","url":""}'::jsonb check (jsonb_typeof(default_cta) = 'object'), product_info jsonb not null default '[]'::jsonb check (jsonb_typeof(product_info) = 'array'),
  created_by uuid not null references public.profiles(id) on delete restrict, updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.evidence_sources (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200), official_url text not null check (char_length(official_url) <= 2048),
  evidence_text text not null check (char_length(evidence_text) between 1 and 20000), content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  is_active boolean not null default true, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, content_hash), unique (brand_id, id)
);
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict, requested_by uuid not null references public.profiles(id) on delete restrict,
  topic text not null check (char_length(topic) between 1 and 300), primary_keyword text not null check (char_length(primary_keyword) between 1 and 120),
  secondary_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(secondary_keywords) = 'array'),
  status text not null check (status in ('planning','plan_ready','drafting','needs_review','completed','failed','cancelled')), idempotency_key uuid not null,
  plan_json jsonb, evidence_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_snapshot) = 'array'), review_items jsonb not null default '[]'::jsonb check (jsonb_typeof(review_items) = 'array'),
  model text not null default 'gpt-5.6-terra' check (model = 'gpt-5.6-terra'), prompt_version integer not null default 1 check (prompt_version > 0),
  input_tokens integer not null default 0 check (input_tokens between 0 and 40000), output_tokens integer not null default 0 check (output_tokens between 0 and 12000),
  estimated_cost_usd numeric(10,6) not null default 0 check (estimated_cost_usd between 0 and 0.60), error_code text, safe_error_message text check (char_length(safe_error_message) <= 500),
  content_id uuid, draft_version_id uuid, created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  unique (brand_id, idempotency_key), constraint generation_jobs_content_scope_fk foreign key (brand_id, content_id) references public.content_items(brand_id, id) on delete restrict,
  constraint generation_jobs_draft_scope_fk foreign key (content_id, draft_version_id) references public.content_versions(content_id, id) on delete restrict
);
create table public.publishing_connections (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null unique references public.brands(id) on delete restrict,
  status text not null default 'active' check (status in ('active','disabled')), bearer_key_hash text not null check (bearer_key_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), disabled_at timestamptz
);
alter table public.content_items add column published_version_id uuid, add column published_at timestamptz, add column publication_updated_at timestamptz,
  add constraint content_items_published_version_fk foreign key (id, published_version_id) references public.content_versions(content_id, id) deferrable initially deferred;
create index evidence_sources_brand_active_idx on public.evidence_sources(brand_id, updated_at desc) where is_active;
create index generation_jobs_brand_created_idx on public.generation_jobs(brand_id, created_at desc);
create index content_items_published_idx on public.content_items(brand_id, publication_updated_at desc) where published_version_id is not null;
create trigger brand_knowledge_profiles_updated_at before update on public.brand_knowledge_profiles for each row execute function public.set_updated_at();
create trigger evidence_sources_updated_at before update on public.evidence_sources for each row execute function public.set_updated_at();

create or replace function public.protect_test_publication_fields() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.published_version_id, new.published_at, new.publication_updated_at) is distinct from (old.published_version_id, old.published_at, old.publication_updated_at) then
    if not public.is_agency_admin(old.brand_id) then raise exception 'Test publication requires agency administrator permission' using errcode = '42501'; end if;
    if new.published_version_id is not null and not exists (select 1 from public.content_versions v where v.id = new.published_version_id and v.content_id = old.id and v.brand_id = old.brand_id and not v.is_working_draft) then
      raise exception 'Test publication requires an immutable explicit version' using errcode = '23514';
    end if;
  end if;
  return new;
end; $$;
create trigger content_items_protect_test_publication before update of published_version_id, published_at, publication_updated_at on public.content_items for each row execute function public.protect_test_publication_fields();
create trigger brand_knowledge_profiles_audit after insert or update on public.brand_knowledge_profiles for each row execute function public.write_scoped_audit_log();
create trigger evidence_sources_audit after insert or update on public.evidence_sources for each row execute function public.write_scoped_audit_log();
create trigger generation_jobs_audit after insert or update on public.generation_jobs for each row execute function public.write_scoped_audit_log();
create trigger publishing_connections_audit after insert or update on public.publishing_connections for each row execute function public.write_scoped_audit_log();
alter table public.brand_knowledge_profiles enable row level security; alter table public.evidence_sources enable row level security;
alter table public.generation_jobs enable row level security; alter table public.publishing_connections enable row level security;
create policy brand_knowledge_profiles_select on public.brand_knowledge_profiles for select to authenticated using (public.can_edit_brand_content(brand_id));
create policy brand_knowledge_profiles_insert on public.brand_knowledge_profiles for insert to authenticated with check (public.can_edit_brand_content(brand_id) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy brand_knowledge_profiles_update on public.brand_knowledge_profiles for update to authenticated using (public.can_edit_brand_content(brand_id)) with check (public.can_edit_brand_content(brand_id) and updated_by = (select auth.uid()));
create policy evidence_sources_select on public.evidence_sources for select to authenticated using (public.can_edit_brand_content(brand_id));
create policy evidence_sources_insert on public.evidence_sources for insert to authenticated with check (public.can_edit_brand_content(brand_id) and created_by = (select auth.uid()));
create policy evidence_sources_update on public.evidence_sources for update to authenticated using (public.can_edit_brand_content(brand_id)) with check (public.can_edit_brand_content(brand_id));
create policy generation_jobs_select on public.generation_jobs for select to authenticated using (public.can_edit_brand_content(brand_id));
create policy generation_jobs_insert on public.generation_jobs for insert to authenticated with check (public.can_edit_brand_content(brand_id) and requested_by = (select auth.uid()));
create policy generation_jobs_update on public.generation_jobs for update to authenticated using (public.can_edit_brand_content(brand_id)) with check (public.can_edit_brand_content(brand_id) and requested_by = (select auth.uid()));
create policy publishing_connections_all on public.publishing_connections for all to authenticated using (public.is_agency_admin(brand_id)) with check (public.is_agency_admin(brand_id));
grant select, insert, update on public.brand_knowledge_profiles, public.evidence_sources, public.generation_jobs to authenticated;
grant select, insert, update, delete on public.publishing_connections to authenticated;
revoke all on function public.protect_test_publication_fields() from public;
commit;
