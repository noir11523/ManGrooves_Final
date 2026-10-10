-- Expected-version conflicts must return HTTP 409, not trigger PostgREST 14
-- serialization retries of the same stale payload. The API retries the whole
-- read/compute/commit operation with fresh revisions and a bounded backoff.
create or replace function public.app_commit(p_expected jsonb, p_writes jsonb)
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
     raise exception using errcode='PT409', message='Concurrent change; retry';
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
       raise exception using errcode='PT409', message='Document already exists';
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
