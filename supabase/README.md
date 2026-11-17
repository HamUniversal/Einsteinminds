# Supabase backend — Einstein Minds

Project ref: `fxxjainrhtdezyzbqynn`  
Region: `us-west-2`  
Last inspected: 2026-11-17

## Deployed Edge Functions

| Function | Active version | JWT |
|---|---:|---|
| `agent` | 27 | Required |
| `resource-search` | 17 | Not required; public catalogue search |
| `resource-outbound` | 14 | Required |
| `provider-introduction` | 13 | Required |
| `paypal-subscriptions` | 9 | Required |
| `paypal-webhook` | 9 | Not required; verifies PayPal webhook signatures |

The AI endpoint has an authenticated `action: health` check. It verifies that an AI key exists and that the configured OpenAI-compatible model endpoint responds to `/models`.

The PayPal subscription endpoint has an authenticated `action: preflight` check. It verifies server-side credentials, the active USD $8 monthly plan, the active USD $60 annual plan, the webhook endpoint URL and required webhook event subscriptions. It does not perform a payment.

## Current public schema inventory

All public tables below have RLS enabled.

| Table | Rows | Notes |
|---|---:|---|
| `profiles` | 1 | One row per adult Auth user |
| `resource_categories` | 24 | Active knowledge categories |
| `resources` | 227 | Published external-provider catalogue records |
| `resource_category_links` | 231 | Resource/category mappings |
| `resource_sources` | 229 | Provenance/source records |
| `resource_verification_evidence` | 0 | No independent review evidence yet |
| `resource_outbound_events` | 2 | Minimal provider-link event records |
| `paypal_subscriptions` | 0 | No subscription has been recorded |
| `paypal_webhook_events` | 0 | No PayPal webhook event has been recorded |
| `user_workspaces` | 0 | Account cloud-sync rows are created on first sync |
| `institutional_access_requests` | 0 | Private adult-account interest requests |

Workspace RLS permits each authenticated user to read, insert, update and delete only their own row. Institutional requests permit authenticated users to insert and read only their own submissions; contact consent is mandatory. Project administrators can review requests through the server-side service role.

The PayPal webhook ledger intentionally has RLS enabled with no client policies and no client grants. It is accessible only to server-side code using the service role.

## Server-side secrets

Never place these in browser code or Hostinger files.

AI:
- `GROQ_API_KEY` or `LLM_API_KEY`
- Optional `LLM_BASE_URL`

PayPal:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_PLAN_MONTHLY_ID`
- `PAYPAL_PLAN_YEARLY_ID`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE`
- `APP_URL`

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. The service-role key must never be sent to the browser.

## Security advisor

- `auth_leaked_password_protection`: WARN — disabled. Enable in Supabase Authentication password settings before public launch.
- `rls_enabled_no_policy` on `paypal_webhook_events`: INFO — intentional; the table is service-role only.
- Several unused-index INFO findings remain. Do not remove indexes without workload evidence.

No trusted `admin` or `catalogue_editor` app-metadata role is currently assigned. Catalogue editing and evidence review are therefore unavailable to normal users. The 227 provider entries must not be described as independently verified.

## Migration history and reproducibility

Eight migrations are applied remotely:

1. `20261115022622_resource_network_v1`
2. `20261115022922_resource_policy_performance_hardening`
3. `20261115023213_resource_category_counts_rpc`
4. `20261115025852_resource_category_admin_and_count_fix`
5. `20261115180822_auth_least_privilege_grants`
6. `20261115180838_grant_authenticated_evidence_review`
7. `20261116153025_paypal_subscription_billing`
8. `20261117053941_user_workspace_and_institutional_requests`

The repository contains the Auth, PayPal and workspace/request migration files. The original four resource-network migration SQL files have not yet been recovered into this branch. This repository is therefore not yet a fully reproducible bootstrap for a brand-new Supabase project. Do not run the migrations against a blank project and assume they recreate the current resource catalogue until those original SQL files are restored.

## Product availability boundaries

- Adult accounts only; child accounts and parental-consent workflows are disabled.
- Educator identity verification and educator-only subscription benefits are not active.
- Institutional products, SSO, LMS integrations, district administration and signed DPA are not active. The interest form stores requests but does not send email.
- Journal and mood entries remain device-local and are excluded from workspace sync.
- AI and PayPal availability depend on server-side secrets and provider status.
