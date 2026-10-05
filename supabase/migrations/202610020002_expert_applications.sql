-- IDs remain in private Storage; only the administrator API may read them.
insert into public.app_collections(name) values ('expert_applications'),('certificate_links') on conflict do nothing;
