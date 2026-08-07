begin;

alter table public.publishing_connections
  drop constraint if exists publishing_connections_provider_check;

alter table public.publishing_connections
  add constraint publishing_connections_provider_check
  check (provider in ('local-test-store','html-export','cafe24','cafe24-board-blog','custom-api'));

comment on column public.publishing_connections.provider is
  'Publishing adapter identifier. cafe24-board-blog remains unavailable until a separately approved Cafe24 installation.';

commit;
