-- Versioned JSONB records retain the existing web/Flutter response contract.
-- All data access is through the trusted API, not a client service-role key.
create table public.app_collections (
  name text primary key,
  revision bigint not null default 0
);
create sequence public.app_revision;
create table public.app_documents (
  collection text not null references public.app_collections(name),
  document_id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default nextval('public.app_revision'),
  primary key (collection, document_id)
);
create index app_document_data on public.app_documents using gin (data jsonb_path_ops);
alter table public.app_documents enable row level security;
alter table public.app_collections enable row level security;
revoke all on public.app_documents, public.app_collections from public, anon, authenticated;
revoke all on sequence public.app_revision from public, anon, authenticated;
insert into public.app_collections(name) values
 ('users'), ('barangays'), ('species'), ('criteria'), ('reports'), ('clusters'),
 ('verification_logs'), ('audit_logs'), ('notifications'), ('badges'),
 ('user_badges'), ('photo_claims'), ('notification_keys'), ('rate_limits'), ('migration_files'), ('meta');

-- One statement returns both rows and the revision of a query's collection.
-- Expected query revisions detect phantom inserts/deletes during transactions.
create function public.app_read(p_collection text, p_id text default null,
  p_filter jsonb default '{}', p_after text default '', p_limit integer default 500)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('revision', coalesce((select revision from public.app_collections where name=p_collection), 0),
   'documents', coalesce((select jsonb_agg(to_jsonb(d)) from (
     select document_id, data, revision from public.app_documents
     where collection=p_collection and (p_id is null or document_id=p_id)
       and data @> p_filter and document_id > p_after
     order by document_id limit greatest(1,least(p_limit,500))
   ) d), '[]'::jsonb));
$$;

-- Compare-and-swap all reads, then apply all writes in ONE PostgreSQL transaction.
-- Only this function mutates app data. A short transaction-scoped lock serializes
-- the comparison+commit, never the HTTP requests, file uploads or scoring work.
create function public.app_commit(p_expected jsonb, p_writes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare e jsonb; w jsonb; actual bigint; c text; ident text; value jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(740320261002);
 if jsonb_array_length(p_writes)>500 then raise exception 'Too many writes'; end if;
 for e in select * from jsonb_array_elements(p_expected) loop
   if e->>'id' is null then
     select revision into actual from public.app_collections where name=e->>'collection';
   else
     select revision into actual from public.app_documents where collection=e->>'collection' and document_id=e->>'id';
   end if;
   if coalesce(actual,0) <> (e->>'revision')::bigint then
     raise exception using errcode='40001', message='Concurrent change; retry';
   end if;
 end loop;
 for w in select * from jsonb_array_elements(p_writes) loop
   c := w->>'collection'; ident := w->>'id'; value := w->'data';
   if length(ident) not between 1 and 180 or ident like '%/%' then raise exception 'Invalid document ID'; end if;
   if not exists(select 1 from public.app_collections where name=c) then raise exception 'Unknown collection'; end if;
   if w->>'mode'='delete' then
     delete from public.app_documents where collection=c and document_id=ident;
   elsif w->>'mode'='create' then
     if exists(select 1 from public.app_documents where collection=c and document_id=ident) then
       raise exception using errcode='40001', message='Document already exists';
     end if;
     insert into public.app_documents(collection, document_id, data) values(c,ident,value);
   elsif w->>'mode'='update' then
     update public.app_documents set data=data||value, revision=nextval('public.app_revision') where collection=c and document_id=ident;
     if not found then raise exception 'Document does not exist'; end if;
   elsif w->>'mode' in ('set','merge') then
     insert into public.app_documents as d(collection,document_id,data) values(c,ident,value)
     on conflict(collection,document_id) do update set
       data=case when w->>'mode'='merge' then d.data||excluded.data else excluded.data end,
       revision=nextval('public.app_revision');
   else raise exception 'Invalid write';
   end if;
   update public.app_collections set revision=nextval('public.app_revision') where name=c;
 end loop;
end;
$$;
revoke all on function public.app_read(text,text,jsonb,text,integer), public.app_commit(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.app_read(text,text,jsonb,text,integer), public.app_commit(jsonb,jsonb) to service_role;

-- Auth tokens can outlive logout/password changes. Check the live Auth session.
create function public.app_session_valid(p_session uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user);
$$;
create function public.app_revoke_sessions(p_user uuid)
returns void language sql security definer set search_path = '' as $$
 delete from auth.sessions where user_id=p_user;
$$;
revoke all on function public.app_session_valid(uuid,uuid), public.app_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.app_session_valid(uuid,uuid), public.app_revoke_sessions(uuid) to service_role;

-- Even a direct Auth REST call cannot change a registered account's email.
create function public.app_keep_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.email is distinct from old.email and exists(
   select 1 from public.app_documents where collection='users' and document_id=old.id::text
 ) then raise exception 'The account email cannot be changed'; end if;
 return new;
end;
$$;
revoke all on function public.app_keep_email() from public, anon, authenticated;
create trigger app_keep_email before update of email on auth.users
for each row execute function public.app_keep_email();

-- No public bucket and no client upload/read policies. API enforces ownership.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('mangrooves','mangrooves',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

-- Only packaged checklist guides/badge artwork go in this public bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('mangrooves-reference','mangrooves-reference',true,5242880,array['image/png','image/svg+xml'])
on conflict(id) do nothing;
