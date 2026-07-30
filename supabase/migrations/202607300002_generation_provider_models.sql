begin;
alter table public.generation_jobs drop constraint generation_jobs_model_check;
alter table public.generation_jobs alter column model set default 'deterministic-fake-v1';
alter table public.generation_jobs add constraint generation_jobs_model_check check ((generation_provider='fake' and model='deterministic-fake-v1') or (generation_provider='openai' and model='gpt-5.6-terra'));
commit;
