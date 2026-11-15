-- Catalogue editors and admins can inspect evidence under the existing RLS policy.
GRANT SELECT ON TABLE public.resource_verification_evidence TO authenticated;
