-- Run as a single transaction. The API keeps the same read/commit RPCs.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(740320261002);
lock table public.app_documents in access exclusive mode;
create schema mangrooves;
create schema mangrooves_archive;
revoke all on schema mangrooves, mangrooves_archive from public, anon, authenticated, service_role;
alter table public.app_documents set schema mangrooves_archive;
alter function public.app_commit(jsonb,jsonb) set schema mangrooves_archive;

-- Account deletion removes the profile, but a historical contributor keeps the same ID.
create table mangrooves.actors (id bigint primary key, auth_user_id uuid unique references auth.users(id) on delete set null);
-- The national reference directory ships with the API. Some IDs have no editable directory row.
create table mangrooves.barangay_keys (id bigint primary key);
create table mangrooves.barangays (
  id bigint not null unique references mangrooves.barangay_keys, psgc_code text, name text,
  city_municipality text, province text, region text, city_psgc text, province_psgc text, region_psgc text,
  country_code text, center_lat numeric, center_lng numeric, monitoring_radius_meters numeric
);
create table mangrooves.users (
  id bigint not null unique references mangrooves.actors, uid text, email text, first_name text, last_name text,
  full_name text, phone text, role text, status text, barangay_id bigint references mangrooves.barangay_keys,
  house_unit text, street_sitio text, zip_code text, created_at timestamptz, privacy_consent_at timestamptz
);
create table mangrooves.expert_applications (
  id bigint, uid text, user_id bigint references mangrooves.actors, full_name text, email text, id_path text,
  status text, reviewer_id bigint references mangrooves.actors, note text, created_at timestamptz, reviewed_at timestamptz
);
create table mangrooves.species (
  id bigint not null unique, scientific_name text, common_name text, local_name text, family text, iucn_code text,
  iucn_label text, population_trend text, root_type text, leaf_shape text, bark_texture text,
  active integer, deleted_at timestamptz
);
create table mangrooves.criteria (
  id bigint not null unique, code text, name text, question_text text, selection_mode text, score_group text,
  guide_image text, display_order integer, active integer, version text
);
create table mangrooves.clusters (
  id bigint not null unique, name text, cluster_code text, sitio_name text, barangay_id bigint references mangrooves.barangay_keys,
  center_lat numeric, center_lng numeric, radius_meters numeric, created_by bigint references mangrooves.actors,
  species_id bigint references mangrooves.species(id) deferrable initially deferred,
  visibility text, verified_count integer, latest_health text, latest_report_id bigint, active integer,
  created_at timestamptz, updated_at timestamptz, deleted_at timestamptz
);
create table mangrooves.reports (
  id bigint not null unique, user_id bigint references mangrooves.actors, expert_id bigint references mangrooves.actors,
  cluster_id bigint references mangrooves.clusters(id) deferrable initially deferred,
  barangay_id bigint references mangrooves.barangay_keys,
  parent_report_id bigint references mangrooves.reports(id) deferrable initially deferred,
  active_child_id bigint references mangrooves.reports(id) deferrable initially deferred,
  suggested_species_id bigint references mangrooves.species(id) deferrable initially deferred,
  final_species_id bigint references mangrooves.species(id) deferrable initially deferred,
  report_number bigint, staff_report_number bigint, report_code text, status text, latitude numeric, longitude numeric,
  sitio_name text, location_source text, location_accuracy numeric, observed_alive_count integer check(observed_alive_count>=0),
  count_unknown boolean, health_score integer, health_max_score integer, suggested_health text, final_health text,
  context_score integer, environmental_score integer, root_type text, leaf_shape text, bark_texture text,
  expert_feedback text, needs_follow_up boolean, photo_path text, closeup_photo_path text, photo_sha256 text,
  submission_token text, submission_digest text, submitted_at timestamptz, verified_at timestamptz,
  observation_snapshots jsonb, trait_observations jsonb
);
alter table mangrooves.clusters add foreign key(latest_report_id) references mangrooves.reports(id) deferrable initially deferred;
create table mangrooves.verification_logs (
  report_id bigint references mangrooves.reports(id) deferrable initially deferred,
  verifier_id bigint references mangrooves.actors, action text, previous_status text, new_status text,
  previous_health text, new_health text, previous_species_id bigint references mangrooves.species(id) deferrable initially deferred,
  new_species_id bigint references mangrooves.species(id) deferrable initially deferred, comment text, created_at timestamptz
);
create table mangrooves.audit_logs (
  user_id bigint references mangrooves.actors, actor_name text, action text, entity_type text, entity_id text,
  details jsonb, created_at timestamptz
);
create table mangrooves.notifications (
  id bigint not null unique, user_id bigint references mangrooves.actors,
  report_id bigint references mangrooves.reports(id) deferrable initially deferred,
  type text, title text, message text, link text, created_at timestamptz, read_at timestamptz
);
create table mangrooves.badges (id bigint not null unique, code text, badge_name text, metric text,
  target_value numeric, description text, image_path text, active integer);
create table mangrooves.user_badges (
  user_id bigint references mangrooves.actors, badge_id bigint references mangrooves.badges(id) deferrable initially deferred,
  certificate_code text, earned_at timestamptz, badge_name_snapshot text, description_snapshot text,
  target_value_snapshot numeric, metric_snapshot text, image_path_snapshot text, unique(user_id,badge_id)
);
create table mangrooves.certificate_links (user_id bigint, badge_id bigint, expires_at bigint,
  foreign key(user_id,badge_id) references mangrooves.user_badges(user_id,badge_id) deferrable initially deferred);
create table mangrooves.photo_claims (
  report_id bigint references mangrooves.reports(id) deferrable initially deferred, digest text,
  submission_token text, report_code text, status text, cluster_id bigint references mangrooves.clusters(id) deferrable initially deferred
);
create table mangrooves.notification_keys (id bigint references mangrooves.notifications(id) deferrable initially deferred);
create table mangrooves.rate_limits (count bigint, expires_at bigint);
create table mangrooves.migration_files (path text);
-- Versioned application settings have different shapes (coverage, counters, trait catalogs).
create table mangrooves.meta ("next" bigint, last_number bigint);

-- One wire document key per row; only unknown fields, explicit nulls and legacy
-- representations go in extensions. Normal scalar values are stored in the typed columns.
create table mangrooves.record_types(name text primary key, columns_sql text not null, assignments_sql text not null);
do $$
declare c text; cols text; assignments text;
begin
  foreach c in array array['users','barangays','species','criteria','clusters','reports','verification_logs',
    'audit_logs','notifications','badges','user_badges','photo_claims','notification_keys','rate_limits',
    'migration_files','meta','expert_applications','certificate_links'] loop
    execute format('alter table mangrooves.%I add column document_id text primary key, add column revision bigint not null,
      add column extensions jsonb not null default ''{}''',c);
    select string_agg(format('%I',a.attname),', ' order by attnum),
      string_agg(format('%1$I=excluded.%1$I',a.attname),', ' order by attnum) filter(where a.attname<>'document_id')
      into cols,assignments from pg_attribute a where attrelid=format('mangrooves.%I',c)::regclass and attnum>0 and not attisdropped;
    insert into mangrooves.record_types values(c,cols,assignments);
  end loop;
end $$;

create table mangrooves.checklist_choices (
  criterion_key text references mangrooves.criteria(document_id) on delete cascade,
  group_name text check(group_name in ('options','archived_options')), position integer check(position>0),
  id bigint, code text, label text, points integer, display_order integer, image_path text, active integer,
  extensions jsonb not null, primary key(criterion_key,group_name,position)
);
create table mangrooves.report_extra_photos (
  report_key text references mangrooves.reports(document_id) on delete cascade,
  position integer check(position>0), path text not null, primary key(report_key,position)
);

create index reports_owner on mangrooves.reports(user_id,submitted_at);
create index reports_site on mangrooves.reports(cluster_id,status,submitted_at);
create index reports_photo_digest on mangrooves.reports(photo_sha256);
create index review_by_report on mangrooves.verification_logs(report_id,created_at);
create index notices_by_user on mangrooves.notifications(user_id,read_at);
create index sites_by_barangay on mangrooves.clusters(barangay_id);
create index claims_by_report on mangrooves.photo_claims(report_id);
create index audit_by_actor on mangrooves.audit_logs(user_id,created_at);

-- Preserve a broken *historical* reference verbatim on the wire, with a NULL SQL FK.
-- This list is populated only from the locked original; new invalid references still fail.
create table mangrooves.legacy_missing_references (
  collection text not null, document_id text not null, field text not null, original_value jsonb not null,
  target_collection text not null, primary key(collection,document_id,field)
);
do $$
declare fk record;
begin
  for fk in select child.relname c, f.attname field, parent.relname target, pk.attname target_field
    from pg_constraint con join pg_class child on child.oid=con.conrelid join pg_class parent on parent.oid=con.confrelid
    join pg_attribute f on f.attrelid=child.oid and f.attnum=con.conkey[1]
    join pg_attribute pk on pk.attrelid=parent.oid and pk.attnum=con.confkey[1]
    where con.contype='f' and cardinality(con.conkey)=1 and child.relnamespace='mangrooves'::regnamespace
      and child.relname in(select name from mangrooves.record_types) and parent.relname in(select name from mangrooves.record_types)
  loop
    insert into mangrooves.legacy_missing_references
      select d.collection,d.document_id,fk.field,d.data->fk.field,fk.target from mangrooves_archive.app_documents d
      where d.collection=fk.c and d.data->>fk.field is not null and not exists(
        select 1 from mangrooves_archive.app_documents p where p.collection=fk.target and p.data->>fk.target_field=d.data->>fk.field);
  end loop;
  insert into mangrooves.legacy_missing_references
    select d.collection,d.document_id,'badge_id',d.data->'badge_id','user_badges' from mangrooves_archive.app_documents d
    where d.collection='certificate_links' and d.data->>'badge_id' is not null and not exists(
      select 1 from mangrooves_archive.app_documents p where p.collection='user_badges'
        and (p.data->>'user_id',p.data->>'badge_id')=(d.data->>'user_id',d.data->>'badge_id'));
end $$;

-- Omit absent columns without stripping explicit nulls inside snapshots.
create function mangrooves.standard_fields(r jsonb, hidden text[]) returns jsonb
language sql immutable set search_path='' as $$
  select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(r-hidden) where value<>'null'::jsonb
$$;
create function mangrooves.leftovers(original jsonb,typed jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(original)
  where value is distinct from typed->key
$$;

create function mangrooves.save_record(c text,k text,v jsonb,rev bigint) returns void
language plpgsql set search_path='' as $$
declare spec mangrooves.record_types; payload jsonb:=v; row_data jsonb; attrs jsonb; missing_fields text[]; g text; opt record; item mangrooves.checklist_choices;
begin
  select * into strict spec from mangrooves.record_types where name=c;
  if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid record in %',c; end if;
  if c='users' then
    insert into mangrooves.actors(id,auth_user_id) values((v->>'id')::bigint,(select id from auth.users where id::text=k))
      on conflict(id) do update set auth_user_id=excluded.auth_user_id;
  end if;
  if c='barangays' or (c in ('reports','clusters','users') and v->>'barangay_id' is not null) then
    insert into mangrooves.barangay_keys values((case when c='barangays' then v->>'id' else v->>'barangay_id' end)::bigint) on conflict do nothing;
  end if;
  if c='criteria' then
    foreach g in array array['options','archived_options'] loop
      if jsonb_typeof(v->g)='array' then payload:=payload||jsonb_build_object(g,'[]'::jsonb); end if;
    end loop;
  elsif c='reports' and jsonb_typeof(v->'extra_photo_paths')='array' then
    payload:=payload||'{"extra_photo_paths":[]}';
  end if;
  delete from mangrooves.legacy_missing_references where collection=c and document_id=k and original_value is distinct from v->field;
  select coalesce(array_agg(field),'{}') into missing_fields from mangrooves.legacy_missing_references where collection=c and document_id=k;
  execute format('select to_jsonb(x) from jsonb_populate_record(null::mangrooves.%I,$1) x',c)
    into row_data using payload-missing_fields-array['document_id','revision','extensions'];
  attrs:=mangrooves.leftovers(payload,mangrooves.standard_fields(row_data,array['document_id','revision','extensions']));
  execute format('insert into mangrooves.%1$I (%2$s) select %2$s from jsonb_populate_record(null::mangrooves.%1$I,$1)
    on conflict(document_id) do update set %3$s',c,spec.columns_sql,spec.assignments_sql)
    using row_data||jsonb_build_object('document_id',k,'revision',rev,'extensions',attrs);
  if c='criteria' then
    delete from mangrooves.checklist_choices where criterion_key=k;
    foreach g in array array['options','archived_options'] loop
      if jsonb_typeof(v->g)='array' then
        for opt in select * from jsonb_array_elements(v->g) with ordinality as a(val,pos) loop
          item:=jsonb_populate_record(null::mangrooves.checklist_choices,opt.val-array['criterion_key','group_name','position','extensions']);
          item.extensions:=mangrooves.leftovers(opt.val,mangrooves.standard_fields(to_jsonb(item),array['criterion_key','group_name','position','extensions']));
          item.criterion_key:=k; item.group_name:=g; item.position:=opt.pos;
          insert into mangrooves.checklist_choices select item.*;
        end loop;
      end if;
    end loop;
  elsif c='reports' then
    delete from mangrooves.report_extra_photos where report_key=k;
    if jsonb_typeof(v->'extra_photo_paths')='array' then
      insert into mangrooves.report_extra_photos select k,ord,path from jsonb_array_elements_text(v->'extra_photo_paths') with ordinality as a(path,ord);
    end if;
  end if;
end $$;

-- Preserve the API's identifiers and wire shapes while reading only the relational tables.
do $$
declare registry record; branches text[]:='{}'; projection text;
begin
  for registry in select name from mangrooves.record_types order by name loop
    projection:='mangrooves.standard_fields(to_jsonb(r),array[''document_id'',''revision'',''extensions'']) || r.extensions';
    if registry.name='criteria' then
      projection:=projection||$q$ || coalesce((select jsonb_object_agg(group_name,answers) from (
        select group_name,jsonb_agg(mangrooves.standard_fields(to_jsonb(o),array['criterion_key','group_name','position','extensions']) || o.extensions order by position) answers
        from mangrooves.checklist_choices o where o.criterion_key=r.document_id group by group_name) choices),'{}')$q$;
    elsif registry.name='reports' then
      projection:=projection||$q$ || coalesce((select jsonb_build_object('extra_photo_paths',jsonb_agg(path order by position))
        from mangrooves.report_extra_photos where report_key=r.document_id having count(*)>0),'{}')$q$;
    end if;
    branches:=array_append(branches,format('select %L::text as collection,document_id,%s as data,revision from mangrooves.%I r',registry.name,projection,registry.name));
  end loop;
  execute 'create view public.app_documents as '||array_to_string(branches,' union all ');
end $$;
revoke all on public.app_documents from public,anon,authenticated,service_role;
grant select on public.app_documents to service_role;

-- History may reference deleted accounts. Keep their original IDs without creating login profiles.
insert into mangrooves.actors(id)
select distinct (data->>key)::bigint from mangrooves_archive.app_documents
cross join unnest(array['user_id','expert_id','verifier_id','reviewer_id','created_by']) as keys(key)
where collection in ('reports','clusters','expert_applications','verification_logs','audit_logs','notifications','user_badges')
  and data->>key is not null on conflict do nothing;
do $$
declare d record;
begin
  for d in select * from mangrooves_archive.app_documents order by (collection='users') desc,collection,document_id loop
    perform mangrooves.save_record(d.collection,d.document_id,d.data,d.revision);
  end loop;
  if exists (select 1 from public.app_documents n full join mangrooves_archive.app_documents o using(collection,document_id)
    where n.data is distinct from o.data or n.revision is distinct from o.revision) then
    raise exception 'Relational backfill differs from the original. Migration cancelled.';
  end if;
end $$;
set constraints all immediate;
set constraints all deferred;

create function mangrooves.edit_record() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    if not exists(select 1 from mangrooves.record_types where name=old.collection) then raise exception 'Unknown collection'; end if;
    execute format('delete from mangrooves.%I where document_id=$1',old.collection) using old.document_id;
    delete from mangrooves.legacy_missing_references where collection=old.collection and document_id=old.document_id;
    return old;
  end if;
  if tg_op='UPDATE' and (old.document_id,old.collection) is distinct from (new.document_id,new.collection) then raise exception 'Record identity cannot change'; end if;
  perform mangrooves.save_record(new.collection,new.document_id,new.data,new.revision);
  return new;
end $$;
create trigger edit_record instead of insert or update or delete on public.app_documents for each row execute function mangrooves.edit_record();

create function public.app_commit(p_expected jsonb,p_writes jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare e jsonb; w jsonb; actual bigint; c text; k text; v jsonb; prior jsonb; mode text;
begin
  perform pg_advisory_xact_lock(740320261002);
  if jsonb_array_length(p_writes)>500 then raise exception 'Too many writes'; end if;
  for e in select * from jsonb_array_elements(p_expected) loop
    if e->>'id' is null then select revision into actual from public.app_collections where name=e->>'collection';
    else select revision into actual from public.app_documents where collection=e->>'collection' and document_id=e->>'id'; end if;
    if coalesce(actual,0)<>(e->>'revision')::bigint then raise exception using errcode='PT409',message='Concurrent change; retry'; end if;
  end loop;
  for w in select * from jsonb_array_elements(p_writes) loop
    c:=w->>'collection'; k:=w->>'id'; v:=w->'data'; mode:=w->>'mode';
    if k is null or length(k) not between 1 and 180 or k like '%/%' then raise exception 'Invalid document ID'; end if;
    if not exists(select 1 from mangrooves.record_types where name=c) then raise exception 'Unknown collection'; end if;
    if mode='delete' then
      execute format('delete from mangrooves.%I where document_id=$1',c) using k;
      delete from mangrooves.legacy_missing_references where collection=c and document_id=k;
    else
      if mode in ('create','update','merge') then
        select data into prior from public.app_documents where collection=c and document_id=k;
        if mode='create' and found then raise exception using errcode='PT409',message='Document already exists'; end if;
        if mode='update' and not found then raise exception 'Document does not exist'; end if;
        if mode in ('update','merge') then v:=coalesce(prior,'{}')||v; end if;
      elsif mode is distinct from 'set' then raise exception 'Invalid write'; end if;
      perform mangrooves.save_record(c,k,v,nextval('public.app_revision'));
    end if;
    update public.app_collections set revision=nextval('public.app_revision') where name=c;
  end loop;
end $$;
revoke all on function public.app_commit(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.app_commit(jsonb,jsonb) to service_role;
revoke all on all tables in schema mangrooves from public,anon,authenticated,service_role;
revoke all on all functions in schema mangrooves from public,anon,authenticated,service_role;

-- Avoid reconstructing photo lists and observations for the public dashboard counts.
create or replace function public.app_public_summary() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('verified_reports',(select count(*) from mangrooves.reports where status='verified'),
    'clusters',(select count(*) from mangrooves.clusters where verified_count>0),
    'species',(select count(*) from mangrooves.species where coalesce(active,1)<>0),
    'guardians',(select count(*) from mangrooves.users where role='guardian' and status='active'));
$$;
commit;
