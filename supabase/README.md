# Supabase backend — Einstein Minds

Project ref: `fxxjainrhtdezyzbqynn`  
Region: `us-west-2`  
Last inspected: 2026-11-18

## Deployed Edge Functions

| Function | Active version | JWT |
|---|---:|---|
| `agent` | 36 | Required |
| `resource-search` | 21 | Not required; public catalogue search and goal-category recommendations |
| `resource-outbound` | 16 | Not required; validates published resource UUID and stored official host |
| `provider-introduction` | 15 | Required |
| `paypal-subscriptions` | 11 | Required |
| `paypal-webhook` | 9 | Not required; verifies PayPal webhook signatures |

Home recommendations use the first explicit learning goal when it maps to an active directory category and exclude saved resource IDs when alternatives exist. Without a matching goal category, the endpoint returns a fresh sample of published directory records. This is category relevance only; it does not establish quality, age suitability or independent verification.

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
| `user_workspaces` | 1 | One account workspace currently exists |
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

### Ask Einstein document attachments

- Supported input: PDF, DOCX, TXT, Markdown and HTML.
- Extraction runs in the browser. PDF.js 6.5.438 extracts PDF text page by page; Mammoth 1.13.0 extracts DOCX text; text and HTML are read locally.
- Limits: 15 MB per file, 40 PDF pages, and 26,000 extracted characters per request.
- PDF page labels are preserved for source references. Other formats use available headings or quoted passages.
- Extracted text is included only in the authenticated request to the `agent` Edge Function. The original file is not uploaded to Supabase Storage, and document text is not added to saved chat history or account workspace data.
- Scanned/image-only PDFs, OCR, embedded image analysis, and visual table/layout extraction are not supported. An empty extraction is reported rather than represented as a successful document read.
- Document content is treated as untrusted source material by the agent; embedded instructions are not to be followed.
- The document-analysis frontend is included in `upgrade/resource-network-v2` after PR #4. It is not live on the production Hostinger site until the release is approved and the Hostinger front end is deployed.

## Product availability boundaries

- Adult accounts only; child accounts and parental-consent workflows are disabled.
- Educator identity verification and educator-only subscription benefits are not active.
- Institutional products, SSO, LMS integrations, district administration and signed DPA are not active. The interest form stores requests but does not send email.
- Journal and mood entries remain device-local and are excluded from workspace sync.
- AI and PayPal availability depend on server-side secrets and provider status.
