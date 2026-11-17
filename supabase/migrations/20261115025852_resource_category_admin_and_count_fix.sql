
create or replace function public.resource_category_counts()
returns table (slug text, name text, actual_listings bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select c.slug, c.name, count(r.id)::bigint
  from public.resource_categories c
  left join public.resource_category_links rcl on rcl.category_id = c.id
  left join public.resources r on r.id = rcl.resource_id and r.is_published = true
  where c.is_active = true
  group by c.id, c.slug, c.name, c.sort_order
  order by c.sort_order;
$$;

drop policy if exists "Catalog admins insert categories" on public.resource_categories;
create policy "Catalog admins insert categories"
  on public.resource_categories for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Catalog admins update categories" on public.resource_categories;
create policy "Catalog admins update categories"
  on public.resource_categories for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Catalog admins delete categories" on public.resource_categories;
create policy "Catalog admins delete categories"
  on public.resource_categories for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));
