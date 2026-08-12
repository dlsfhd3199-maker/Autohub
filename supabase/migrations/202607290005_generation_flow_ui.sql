begin;
alter table public.generation_jobs
  add column selected_product jsonb,
  add column cancelled_at timestamptz;
commit;
