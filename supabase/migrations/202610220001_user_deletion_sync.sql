-- Users contains application profiles; Supabase Auth contains login accounts.
-- Existing orphan profiles are hidden by the directory without deleting data.
create or replace function public.app_existing_auth_users(p_users jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(u.id::text),'[]'::jsonb)
  from auth.users u where u.id::text in (select jsonb_array_elements_text(p_users));
$$;
revoke all on function public.app_existing_auth_users(jsonb) from public, anon, authenticated;
grant execute on function public.app_existing_auth_users(jsonb) to service_role;

-- Also covers deletion through Supabase's Authentication dashboard. Keep
-- historical reports/reviews and their snapshots; remove the account profile.
create or replace function public.app_remove_deleted_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  perform pg_catalog.pg_advisory_xact_lock(740320261002);
  foreach c in array array['users','expert_applications'] loop
    delete from public.app_documents where collection=c and document_id=old.id::text;
    if found then
      update public.app_collections set revision=nextval('public.app_revision') where name=c;
    end if;
  end loop;
  return old;
end;
$$;
revoke all on function public.app_remove_deleted_auth_user() from public, anon, authenticated;
create trigger app_remove_deleted_auth_user after delete on auth.users
for each row execute function public.app_remove_deleted_auth_user();
