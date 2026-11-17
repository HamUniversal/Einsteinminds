
-- Least-privilege grants for the public Data API.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public catalogue reads only.
GRANT SELECT ON TABLE
  public.resource_categories,
  public.resource_category_links,
  public.resources,
  public.resource_sources
TO anon, authenticated;

-- Profile data is private and self-managed under the existing owner-scoped RLS policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- Catalogue writes remain available to authenticated JWTs only; existing RLS
-- policies further restrict them to app_metadata roles admin/catalogue_editor.
GRANT INSERT, UPDATE, DELETE ON TABLE
  public.resource_categories,
  public.resource_category_links,
  public.resources,
  public.resource_sources,
  public.resource_verification_evidence
TO authenticated;

-- Minimal anonymous/authenticated outbound click event insertion.
GRANT INSERT ON TABLE public.resource_outbound_events TO anon, authenticated;
GRANT SELECT ON TABLE public.resource_outbound_events TO authenticated;

-- Restrict future public-schema objects by default. Specific API objects must
-- receive explicit grants in their migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Keep the one intended public RPC callable.
REVOKE ALL ON FUNCTION public.resource_category_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resource_category_counts() TO anon, authenticated;
