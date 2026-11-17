-- Run after 00–03 catalogue seed scripts.
with actual as (
  select
    (select count(*) from public.resource_categories where is_active)::bigint as categories,
    (select count(*) from public.resources where is_published)::bigint as published_resources,
    (select count(*) from public.resource_category_links)::bigint as category_links,
    (select count(*) from public.resource_sources)::bigint as source_records
)
select
  categories,
  published_resources,
  category_links,
  source_records,
  categories = 24
    and published_resources = 227
    and category_links = 231
    and source_records = 229 as seed_counts_match_snapshot
from actual;
