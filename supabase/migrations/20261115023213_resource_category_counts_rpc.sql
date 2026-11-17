create or replace function public.resource_category_counts()
returns table (slug text, name text, actual_listings bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select c.slug, c.name, count(rcl.resource_id)::bigint
  from public.resource_categories c
  left join public.resource_category_links rcl on rcl.category_id = c.id
  left join public.resources r on r.id = rcl.resource_id and r.is_published = true
  where c.is_active = true
  group by c.id, c.slug, c.name, c.sort_order
  order by c.sort_order;
$$;
grant execute on function public.resource_category_counts() to anon, authenticated;
