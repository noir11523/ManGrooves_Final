create extension if not exists postgis with schema extensions;

create table public.app_barangay_boundaries (
  psgc_code text primary key check (psgc_code ~ '^[0-9]{10}$'),
  boundary extensions.geometry(Geometry,4326) not null,
  check (extensions.st_srid(boundary)=4326),
  check (extensions.geometrytype(boundary) in ('POLYGON','MULTIPOLYGON'))
);
create index app_barangay_boundaries_gist on public.app_barangay_boundaries using gist(boundary);
alter table public.app_barangay_boundaries enable row level security;
revoke all on public.app_barangay_boundaries from public, anon, authenticated;

create or replace function public.app_barangay_code_at(p_latitude double precision,p_longitude double precision)
returns text language sql stable security definer set search_path = '' as $$
  with matches as (
    select psgc_code
    from public.app_barangay_boundaries
    where p_latitude between 4.5 and 21.2 and p_longitude between 116.8 and 126.7
      and extensions.st_covers(boundary,extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326))
    limit 2
  )
  select case when count(*)=1 then min(psgc_code) end from matches;
$$;

create or replace function public.app_upsert_barangay_boundaries(p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare written integer;
begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>200 then
    raise exception 'Invalid barangay boundary batch';
  end if;
  insert into public.app_barangay_boundaries(psgc_code,boundary)
  select item->>'psgc_code',
    extensions.st_setsrid(extensions.st_geomfromgeojson((item->'geometry')::text),4326)
  from jsonb_array_elements(p_rows) item
  on conflict(psgc_code) do update set boundary=excluded.boundary;
  get diagnostics written=row_count;
  return written;
end;
$$;

create or replace function public.app_barangay_boundary_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.app_barangay_boundaries;
$$;

revoke all on function public.app_barangay_code_at(double precision,double precision),
  public.app_upsert_barangay_boundaries(jsonb),public.app_barangay_boundary_count()
  from public,anon,authenticated;
grant execute on function public.app_barangay_code_at(double precision,double precision),
  public.app_upsert_barangay_boundaries(jsonb),public.app_barangay_boundary_count()
  to service_role;
