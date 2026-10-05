-- Return totals in one read without transferring private report/account records.
create function public.app_public_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
 select pg_catalog.jsonb_build_object(
   'verified_reports', count(*) filter (where collection='reports' and data @> '{"status":"verified"}'::jsonb),
   'clusters', count(*) filter (where collection='clusters' and coalesce((data->>'verified_count')::numeric,0)>0),
   'species', count(*) filter (where collection='species' and coalesce((data->>'active')::numeric,1)<>0),
   'guardians', count(*) filter (where collection='users' and data @> '{"role":"guardian","status":"active"}'::jsonb)
 ) from public.app_documents where collection in ('reports','clusters','species','users');
$$;
revoke all on function public.app_public_summary() from public, anon, authenticated;
grant execute on function public.app_public_summary() to service_role;
