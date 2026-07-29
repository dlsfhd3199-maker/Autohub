alter table public.generation_jobs
  add column actual_cost_usd numeric(10,6) not null default 0
  check (actual_cost_usd between 0 and 0.60);

comment on column public.generation_jobs.estimated_cost_usd is
  'Preflight upper-bound estimate calculated before any OpenAI request.';
comment on column public.generation_jobs.actual_cost_usd is
  'Conservative cost calculated from API-reported input/output usage at standard model rates.';
