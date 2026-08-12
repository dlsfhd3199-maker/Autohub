begin;
select plan(2);
select is(public.get_test_publishing_connection_status('missing-brand', repeat('a',64)), 'unauthorized', 'missing brand is safely unauthorized');
select has_function('public', 'get_test_publishing_connection_status', array['text','text'], 'publishing connection status function exists');
select * from finish();
rollback;
