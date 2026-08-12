begin;
create unique index generation_jobs_one_active_idx on public.generation_jobs ((1)) where status in ('planning','drafting');
create index generation_jobs_daily_limit_idx on public.generation_jobs(created_at) where status <> 'cancelled';
grant select, insert, update, delete on public.brand_knowledge_profiles, public.evidence_sources, public.generation_jobs, public.publishing_connections to service_role;
commit;
