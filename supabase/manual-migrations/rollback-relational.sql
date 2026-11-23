-- Operator-only. Pause writers and verify the backups before switching back.
-- Rebuild the document table from CURRENT rows, including edits made after cutover.
begin;
set local lock_timeout='10s';
select pg_advisory_xact_lock(740320261002);
lock table public.app_collections in access exclusive mode;
alter view public.app_documents set schema mangrooves;
create table public.app_documents (like mangrooves_archive.app_documents including all);
alter table public.app_documents add foreign key(collection) references public.app_collections(name);
alter table public.app_documents enable row level security;
revoke all on public.app_documents from public, anon, authenticated, service_role;
do $$
declare privilege text;
begin
  foreach privilege in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
    if has_table_privilege('service_role','mangrooves_archive.app_documents',privilege) then
      execute format('grant %s on public.app_documents to service_role',privilege);
    end if;
  end loop;
end $$;
insert into public.app_documents(collection,document_id,data,revision)
  select collection,document_id,data,revision from mangrooves.app_documents;
do $$
begin
  if exists(select 1 from mangrooves.app_documents r full join public.app_documents d using(collection,document_id)
    where r.data is distinct from d.data or r.revision is distinct from d.revision) then
    raise exception 'Rollback cancelled: record or revision mismatch.';
  end if;
end $$;
alter function public.app_commit(jsonb,jsonb) set schema mangrooves;
alter function mangrooves_archive.app_commit(jsonb,jsonb) set schema public;
create or replace function public.app_public_summary() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'verified_reports',count(*) filter(where collection='reports' and data @> '{"status":"verified"}'),
    'clusters',count(*) filter(where collection='clusters' and (data->>'verified_count')::numeric>0),
    'species',count(*) filter(where collection='species' and coalesce((data->>'active')::numeric,1)<>0),
    'guardians',count(*) filter(where collection='users' and data @> '{"role":"guardian","status":"active"}'))
  from public.app_documents where collection in ('reports','clusters','species','users');
$$;
commit;
