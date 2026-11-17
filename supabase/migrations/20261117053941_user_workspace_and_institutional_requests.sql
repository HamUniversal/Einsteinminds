
CREATE TABLE IF NOT EXISTS public.user_workspaces (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_workspaces_state_object CHECK (
    jsonb_typeof(state) = 'object' AND pg_column_size(state) <= 524288
  )
);

ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_workspaces FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_workspaces TO authenticated;

DROP POLICY IF EXISTS "Users can read their own workspace" ON public.user_workspaces;
CREATE POLICY "Users can read their own workspace"
  ON public.user_workspaces FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own workspace" ON public.user_workspaces;
CREATE POLICY "Users can create their own workspace"
  ON public.user_workspaces FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own workspace" ON public.user_workspaces;
CREATE POLICY "Users can update their own workspace"
  ON public.user_workspaces FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own workspace" ON public.user_workspaces;
CREATE POLICY "Users can delete their own workspace"
  ON public.user_workspaces FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.institutional_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name text NOT NULL CHECK (char_length(btrim(organization_name)) BETWEEN 2 AND 160),
  contact_email text NOT NULL CHECK (contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND char_length(contact_email) <= 254),
  contact_role text NOT NULL CHECK (char_length(btrim(contact_role)) BETWEEN 2 AND 120),
  estimated_seats integer CHECK (estimated_seats IS NULL OR estimated_seats BETWEEN 1 AND 1000000),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
  consent_to_contact boolean NOT NULL DEFAULT false CHECK (consent_to_contact = true),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institutional_access_requests_user_created_idx
  ON public.institutional_access_requests (user_id, created_at DESC);

ALTER TABLE public.institutional_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institutional_access_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.institutional_access_requests TO authenticated;

DROP POLICY IF EXISTS "Users can submit their own institutional requests" ON public.institutional_access_requests;
CREATE POLICY "Users can submit their own institutional requests"
  ON public.institutional_access_requests FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND consent_to_contact = true);

DROP POLICY IF EXISTS "Users can read their own institutional requests" ON public.institutional_access_requests;
CREATE POLICY "Users can read their own institutional requests"
  ON public.institutional_access_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own PayPal subscription" ON public.paypal_subscriptions;
CREATE POLICY "Users can read their own PayPal subscription"
  ON public.paypal_subscriptions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
