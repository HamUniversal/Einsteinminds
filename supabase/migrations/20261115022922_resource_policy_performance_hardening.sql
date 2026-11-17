
drop policy if exists "Public can read published resources" on public.resources;
drop policy if exists "Catalog admins manage resources" on public.resources;
create policy "Public and catalog admins read resources"
  on public.resources for select to anon, authenticated
  using (
    is_published
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor')
  );
create policy "Catalog admins insert resources"
  on public.resources for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins update resources"
  on public.resources for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins delete resources"
  on public.resources for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Public can read categories for published resources" on public.resource_category_links;
drop policy if exists "Catalog admins manage category mappings" on public.resource_category_links;
create policy "Public and catalog admins read category mappings"
  on public.resource_category_links for select to anon, authenticated
  using (
    (
      exists (select 1 from public.resources r where r.id = resource_id and r.is_published)
      and exists (select 1 from public.resource_categories c where c.id = category_id and c.is_active)
    )
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor')
  );
create policy "Catalog admins insert category mappings"
  on public.resource_category_links for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins update category mappings"
  on public.resource_category_links for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins delete category mappings"
  on public.resource_category_links for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Public can read provenance for published resources" on public.resource_sources;
drop policy if exists "Catalog admins manage provenance" on public.resource_sources;
create policy "Public and catalog admins read provenance"
  on public.resource_sources for select to anon, authenticated
  using (
    exists (select 1 from public.resources r where r.id = resource_id and r.is_published)
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor')
  );
create policy "Catalog admins insert provenance"
  on public.resource_sources for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins update provenance"
  on public.resource_sources for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
create policy "Catalog admins delete provenance"
  on public.resource_sources for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Catalog admins inspect verification evidence" on public.resource_verification_evidence;
create policy "Catalog admins inspect verification evidence"
  on public.resource_verification_evidence for all to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Catalog admins read outbound analytics" on public.resource_outbound_events;
create policy "Catalog admins read outbound analytics"
  on public.resource_outbound_events for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
