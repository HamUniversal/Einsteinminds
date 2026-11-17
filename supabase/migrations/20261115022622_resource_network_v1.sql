
create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique
    check (canonical_url ~ '^https://[^[:space:]]+$'),
  official_domain text not null,
  name text not null,
  resource_type text not null default 'website'
    check (resource_type in ('company','organization','website','application','software','school','college','university','research_institution','library','museum','course','database','community','professional_organization','nonprofit','government_service','other')),
  directory_description text not null default '',
  provider_introduction text,
  intro_status text not null default 'not_captured'
    check (intro_status in ('not_captured','official_meta','official_api','provider_supplied','attributed_excerpt','unavailable')),
  intro_source_url text,
  intro_language text,
  intro_retrieved_at timestamptz,
  original_language text,
  supported_languages text[] not null default '{}',
  country_or_region text,
  cost_model text not null default 'unknown'
    check (cost_model in ('free','freemium','paid','mixed','unknown')),
  pricing_url text,
  accessibility_metadata jsonb not null default '{}'::jsonb,
  licensing_metadata jsonb not null default '{}'::jsonb,
  privacy_url text,
  evidence_status text not null default 'not_reviewed'
    check (evidence_status in ('not_reviewed','evidence_available','independently_reviewed','evidence_not_found')),
  source_status text not null default 'catalogue_entry'
    check (source_status in ('catalogue_entry','official_domain_confirmed','provider_identity_confirmed')),
  editorial_status text not null default 'not_reviewed'
    check (editorial_status in ('candidate','not_reviewed','reviewed','rejected')),
  learning_stages text[] not null default '{}',
  learning_stage_evidence_url text,
  learning_stage_reviewed_at timestamptz,
  is_published boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_successful_link_check timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple',
      coalesce(name,'') || ' ' ||
      coalesce(directory_description,'') || ' ' ||
      coalesce(provider_introduction,'') || ' ' ||
      coalesce(official_domain,'')
    )
  ) stored,
  constraint resources_learning_stages_valid check (
    learning_stages <@ array[
      'pre_k','kindergarten','primary','middle','secondary','vocational',
      'undergraduate','graduate','doctoral','professional','entrepreneur','lifelong'
    ]::text[]
  )
);

create table if not exists public.resource_category_links (
  resource_id uuid not null references public.resources(id) on delete cascade,
  category_id uuid not null references public.resource_categories(id) on delete cascade,
  mapping_source text not null default 'catalogue_mapping',
  mapping_review_status text not null default 'not_reviewed'
    check (mapping_review_status in ('not_reviewed','reviewed','rejected')),
  created_at timestamptz not null default now(),
  primary key (resource_id, category_id)
);

create table if not exists public.resource_sources (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  provider_name text not null,
  provider_record_id text,
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$'),
  source_type text not null default 'catalogue_seed',
  permitted_usage text not null default 'not_assessed',
  attribution_requirement text,
  source_notes text,
  retrieved_at timestamptz not null default now(),
  content_hash text,
  created_at timestamptz not null default now(),
  unique (resource_id, source_url, source_type)
);

create table if not exists public.resource_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  check_type text not null
    check (check_type in ('official_domain','provider_identity','link_health','accreditation','editorial','evidence','rights','accessibility','privacy','learning_stage')),
  status text not null
    check (status in ('passed','failed','unknown','not_applicable')),
  evidence_source text,
  evidence_url text,
  checked_at timestamptz not null default now(),
  next_review_at timestamptz,
  reviewer_role text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_outbound_events (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  category_slug text,
  provider_host text not null,
  utm_applied boolean not null default false,
  clicked_at timestamptz not null default now(),
  constraint outbound_provider_host_safe check (
    provider_host = lower(provider_host)
    and provider_host !~ '[/:@[:space:]]'
  )
);

create index if not exists resources_published_idx
  on public.resources (is_published, name);
create index if not exists resources_domain_idx
  on public.resources (official_domain);
create index if not exists resources_learning_stages_gin
  on public.resources using gin (learning_stages);
create index if not exists resources_search_gin
  on public.resources using gin (search_document);
create index if not exists resource_category_links_category_idx
  on public.resource_category_links (category_id, resource_id);
create index if not exists resource_sources_resource_idx
  on public.resource_sources (resource_id);
create index if not exists resource_verification_resource_idx
  on public.resource_verification_evidence (resource_id, checked_at desc);
create index if not exists resource_outbound_clicked_idx
  on public.resource_outbound_events (clicked_at desc);
create index if not exists resource_outbound_resource_idx
  on public.resource_outbound_events (resource_id, clicked_at desc);

alter table public.resource_categories enable row level security;
alter table public.resources enable row level security;
alter table public.resource_category_links enable row level security;
alter table public.resource_sources enable row level security;
alter table public.resource_verification_evidence enable row level security;
alter table public.resource_outbound_events enable row level security;

drop policy if exists "Public can read active resource categories" on public.resource_categories;
create policy "Public can read active resource categories"
  on public.resource_categories for select to anon, authenticated
  using (is_active);

drop policy if exists "Public can read published resources" on public.resources;
create policy "Public can read published resources"
  on public.resources for select to anon, authenticated
  using (is_published);

drop policy if exists "Catalog admins manage resources" on public.resources;
create policy "Catalog admins manage resources"
  on public.resources for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Public can read categories for published resources" on public.resource_category_links;
create policy "Public can read categories for published resources"
  on public.resource_category_links for select to anon, authenticated
  using (
    exists (select 1 from public.resources r where r.id = resource_id and r.is_published)
    and exists (select 1 from public.resource_categories c where c.id = category_id and c.is_active)
  );

drop policy if exists "Catalog admins manage category mappings" on public.resource_category_links;
create policy "Catalog admins manage category mappings"
  on public.resource_category_links for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Public can read provenance for published resources" on public.resource_sources;
create policy "Public can read provenance for published resources"
  on public.resource_sources for select to anon, authenticated
  using (
    exists (select 1 from public.resources r where r.id = resource_id and r.is_published)
  );

drop policy if exists "Catalog admins manage provenance" on public.resource_sources;
create policy "Catalog admins manage provenance"
  on public.resource_sources for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Catalog admins inspect verification evidence" on public.resource_verification_evidence;
create policy "Catalog admins inspect verification evidence"
  on public.resource_verification_evidence for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','catalogue_editor'));

drop policy if exists "Allow minimal outbound click events" on public.resource_outbound_events;
create policy "Allow minimal outbound click events"
  on public.resource_outbound_events for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.resources r
      where r.id = resource_id
        and r.is_published
        and r.official_domain = provider_host
    )
  );

drop policy if exists "Catalog admins read outbound analytics" on public.resource_outbound_events;
create policy "Catalog admins read outbound analytics"
  on public.resource_outbound_events for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.resource_categories, public.resources, public.resource_category_links, public.resource_sources to anon, authenticated;
grant select, insert, update, delete on public.resource_categories, public.resources, public.resource_category_links, public.resource_sources, public.resource_verification_evidence to authenticated;
grant insert on public.resource_outbound_events to anon, authenticated;
grant select on public.resource_outbound_events to authenticated;
grant usage, select on sequence public.resource_outbound_events_id_seq to anon, authenticated;

insert into public.resource_categories (slug,name,description,sort_order) values
('math','Mathematics & Quantitative Sciences','Algebra, calculus, statistics, modelling and data analysis',1),
('science','Natural Sciences','Physics, chemistry, biology, astronomy and earth systems',2),
('tech','Engineering & Technology','Computer science, AI, robotics and software engineering',3),
('humanities','Humanities & Civilization','History, philosophy, literature, ethics and culture',4),
('language','Language & Communication','World languages, linguistics, writing and rhetoric',5),
('health','Health & Wellbeing','Anatomy, nutrition, mental health literacy and movement',6),
('business','Business, Economics & Finance','Economics, entrepreneurship, management and financial literacy',7),
('arts','Arts, Culture & Creative Industries','Visual arts, music, film, design and creative writing',8),
('emerging','Specialized & Emerging Knowledge','Space, quantum technology, biotech and future industries',9),
('social','Social Sciences','Psychology, sociology, political science and anthropology',10),
('university','University & Advanced Research','Graduate study, doctoral research and scholarly method',11),
('early','Foundation & Early Development','Early childhood, play, emergent literacy and family learning',12),
('agriculture','Agriculture, Food & Environment','Farming, food systems, climate and conservation',13),
('law','Law, Civics & Society','Legal literacy, government, rights and media literacy',14),
('vocational','Practical, Vocational & Life Skills','Trades, hospitality, logistics and independent living',15),
('making','Design, Making & Innovation','Engineering design, prototyping, physical computing and the craft of building real things',16),
('space','Space & Aerospace Engineering','Orbital mechanics, astrophysics, rocketry and space exploration technologies',17),
('culinary','Culinary Arts & Gastronomy','Professional cooking, food science, pastry arts and global cuisines',18),
('leadership','Personal Development & Leadership','Executive coaching, emotional intelligence, productivity and management',19),
('audio','Music Production & Audio Engineering','Sound design, mixing, mastering, music theory and digital audio workstations',20),
('film','Film, Photography & Visual Media','Cinematography, directing, photo editing, lighting and visual storytelling',21),
('fitness','Health, Fitness & Sports Science','Kinesiology, nutrition, athletic training, biomechanics and wellness',22),
('linguistics','Linguistics & Translation Studies','Syntax, phonetics, computational linguistics, interpretation and language acquisition',23),
('esports','Esports, Game Design & Interactive Media','Game development, competitive gaming, 3D modeling, UI design and narrative design',24)
on conflict (slug) do update
set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true, updated_at=now();
