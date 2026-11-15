-- Least-privilege grants for the public Data API.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public catalogue reads only.
GRANT SELECT ON TABLE
  public.resource_categories,
  public.resource_category_links,
  public.resources,
  public.resource_sources
TO anon, authenticated;

-- Profiles are private and self-managed under owner-scoped RLS policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- Catalogue writes require an authenticated JWT and are further restricted
-- by app_metadata role checks in the existing RLS policies.
GRANT INSERT, UPDATE, DELETE ON TABLE
  public.resource_categories,
  public.resource_category_links,
  public.resources,
  public.resource_sources,
  public.resource_verification_evidence
TO authenticated;

-- Minimal outbound event insertion; analytics reads are authenticated/admin only.
GRANT INSERT ON TABLE public.resource_outbound_events TO anon, authenticated;
GRANT SELECT ON TABLE public.resource_outbound_events TO authenticated;

-- Restrict defaults for objects created by the migration owner.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Keep the intended public catalogue statistics RPC callable.
REVOKE ALL ON FUNCTION public.resource_category_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resource_category_counts() TO anon, authenticated;
