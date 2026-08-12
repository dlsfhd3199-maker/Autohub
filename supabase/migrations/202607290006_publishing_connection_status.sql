begin;

create or replace function public.get_test_publishing_connection_status(target_brand_key text, supplied_bearer_hash text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when pc.bearer_key_hash <> supplied_bearer_hash then 'unauthorized'
    when pc.status = 'disabled' or pc.disabled_at is not null then 'disabled'
    else 'active'
  end
  from public.brands b
  join public.publishing_connections pc on pc.brand_id = b.id
  where b.brand_key = target_brand_key and b.archived_at is null
  union all select 'unauthorized'
  limit 1
$$;

revoke all on function public.get_test_publishing_connection_status(text,text) from public;
grant execute on function public.get_test_publishing_connection_status(text,text) to anon;

commit;
