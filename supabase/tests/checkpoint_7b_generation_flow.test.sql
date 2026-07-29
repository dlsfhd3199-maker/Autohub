begin;
select plan(2);
select has_column('public', 'generation_jobs', 'selected_product', 'generation jobs retain the selected virtual product snapshot');
select has_column('public', 'generation_jobs', 'cancelled_at', 'generation jobs record explicit cancellation');
select * from finish();
rollback;
