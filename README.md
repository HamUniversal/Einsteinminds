# Einstein Minds

Einstein Minds is deployed as a **static web application on Hostinger**. GitHub is the application source of truth; Supabase provides authentication, the resource catalogue, private account workspaces, AI Edge Functions and PayPal subscription handling.

- Production URL: https://einsteinminds.com
- Supabase project: `fxxjainrhtdezyzbqynn`
- Frontend deployment: Hostinger `public_html`
- No Node.js runtime, build command or Hostinger environment variables are required for the static frontend.

## Deploy the Hostinger package

1. Back up the current contents of Hostinger `public_html`.
2. Upload the release ZIP.
3. Extract it directly into `public_html`.
4. Confirm that `index.html`, `.htaccess` and `assets/` are directly inside `public_html`.
5. Open https://einsteinminds.com and hard-refresh the page.

The `.htaccess` file provides SPA fallback for the Supabase auth callback path, disables directory listings, prevents stale HTML caching and applies security headers. Static assets are cached for one hour.

## Supabase services

Active Edge Functions (verified 2026-11-17):

| Function | Version | JWT |
|---|---:|---|
| `agent` | 36 | Required |
| `resource-search` | 19 | Not required; public catalogue search only |
| `resource-outbound` | 16 | Not required; validates published resource UUID and stored official host |
| `provider-introduction` | 15 | Required |
| `paypal-subscriptions` | 11 | Required |
| `paypal-webhook` | 9 | Not required; PayPal signature verification is required |

The project contains 24 active resource categories, 227 published provider records, 231 category mappings and 229 source records. The verification-evidence table currently contains **zero records**; directory entries are not independently reviewed or endorsed.

The database includes adult account profiles, private PayPal subscription records, a private webhook idempotency ledger, the account-owned `user_workspaces` table and the account-owned `institutional_access_requests` table. Row-level security is enabled on all public tables. Workspace and institutional request policies use `auth.uid()` and restrict records to the signed-in owner.

The `paypal_webhook_events` table intentionally has RLS enabled with no client policies and no client grants; only the server-side service role can write/read the webhook ledger.

## Supabase secrets (server-side only)

Configure these under Supabase Edge Function secrets. **Never paste them into this repository, the browser, or Hostinger.**

AI:
- `GROQ_API_KEY` (or `LLM_API_KEY`)
- Optional `LLM_BASE_URL` for an OpenAI-compatible HTTPS endpoint

PayPal:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_PLAN_MONTHLY_ID`
- `PAYPAL_PLAN_YEARLY_ID`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE` = `live` or `sandbox`
- `APP_URL` = `https://einsteinminds.com`

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not place the service-role key in the frontend.

The app now checks AI provider connectivity after sign-in. PayPal checkout runs a server-side preflight that checks credentials, the active $8/month and $60/year plans, and the webhook URL/event subscriptions before enabling checkout. This validates configuration; it does not replace a real PayPal sandbox/live purchase test.

## Supabase Auth settings

- Site URL: `https://einsteinminds.com`
- Redirect allow-list: `https://einsteinminds.com/**`
- Add `https://www.einsteinminds.com/**` only if the www host is used.
- For Hostinger preview testing, add `https://*.hostingersite.com/**` (or the exact preview hostname shown in Hostinger).
- For local testing, add the exact localhost origin used by the local server.

The app sends confirmation and recovery redirects to the current site root. Configure a production SMTP provider in Supabase Auth so confirmation and recovery emails can be delivered reliably.

## Live features and current limits

Live:
- Supabase adult-account signup, sign-in, password recovery and protected routes.
- Resource directory search against the Supabase catalogue.
- Safe outbound provider links through the outbound Edge Function.
- AI Ask Einstein and AI lesson drafting, subject to the AI provider health check.
- Ask Einstein can read extracted text from PDF, DOCX, TXT, Markdown and HTML attachments. Text extraction occurs in the browser; the extracted text is sent to the authenticated Groq-backed agent for that request and is not saved to the account or conversation history.
- Account workspace sync for saved providers, goals, portfolio, assessment history, screen-time totals, preferences and learning events when cloud sync is enabled.
- PayPal subscription create/cancel/return synchronization when preflight passes.
- Institutional interest requests stored privately in Supabase.

Not currently offered:
- Child accounts, child AI access or parental-consent verification.
- Educator identity verification or educator-only subscription benefits.
- Institutional accounts, SSO, LMS integrations, district administration or a signed DPA.
- Scanned-PDF OCR, embedded-image analysis, visual table/layout extraction, voice, image generation, code execution and virtual laboratories.
- Email notifications for institutional interest requests.
- Self-service account deletion.

Journal and mood entries remain in this browser and are not included in cloud workspace sync. The screen-time tracker records only activity within Einstein Minds; it does not monitor the device or other apps.

## Security follow-up before public launch

The Supabase security advisor currently reports **leaked-password protection disabled**. Enable it in Supabase Authentication password settings. The project also has one INFO finding for the intentionally private `paypal_webhook_events` table and unused-index INFO findings; do not add client policies to the webhook ledger merely to silence the advisor.

There is currently one Auth user/profile, zero workspace rows, zero institutional requests, zero PayPal subscription rows and zero webhook events. No successful payment has yet been recorded in this project.

### Ask Einstein document attachments

- Supported input: PDF, DOCX, TXT, Markdown and HTML.
- Extraction runs in the browser. PDF.js 6.5.438 extracts PDF text page by page; Mammoth 1.13.0 extracts DOCX text; text and HTML are read locally.
- Limits: 15 MB per file, 40 PDF pages, and 26,000 extracted characters per request.
- PDF page labels are preserved for source references. Other formats use available headings or quoted passages.
- Extracted text is included only in the authenticated request to the `agent` Edge Function. The original file is not uploaded to Supabase Storage, and document text is not added to saved chat history or account workspace data.
- Scanned/image-only PDFs, OCR, embedded image analysis, and visual table/layout extraction are not supported. An empty extraction is reported rather than represented as a successful document read.
- Document content is treated as untrusted source material by the agent; embedded instructions are not to be followed.
- The frontend change is under review on `feature/ask-einstein-document-analysis`. It is not yet in the production Hostinger site.

## Migration-source note

The remote project has eight applied migration entries. The repository contains the Auth, PayPal and workspace/request migration files. The original four resource-network migration SQL files are not currently present in this branch, so this repository is not yet a fully reproducible bootstrap for a brand-new Supabase project. Do not run it against a blank project expecting it to recreate the existing resource catalogue schema until those original migration files are recovered.
