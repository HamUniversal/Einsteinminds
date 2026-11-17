# Einstein Minds — Current Architecture

**Verified:** 18 November 2026  
**Production site:** https://einsteinminds.com  
**GitHub source:** `HamUniversal/Einsteinminds`  
**Current release branch:** `upgrade/resource-network-v2`

This document describes the connected product architecture. The older `docs:ARCHITECTURE.md` file describes a historical client-side prototype and is not the current production architecture reference.

## 1. Front end — Hostinger static site

The application is a static HTML/CSS/JavaScript site deployed to Hostinger `public_html`. It does not require a Node.js server, build command or Hostinger environment variables.

- `index.html`: page shell, views, forms, user interface and application controllers.
- `assets/auth-route-guard.js`: protected route and session-aware navigation behavior.
- `assets/resource-network-core.js`: validation helpers, learning-stage taxonomy, safe URL handling and resource display labels.
- `assets/einsteinminds-resource-network.js`: Supabase directory integration, provider detail UI, controlled outbound links, saved resources and home recommendations.
- `assets/resource-network.css`: resource-network styles.
- `.htaccess`: SPA/auth callback fallback, no-cache HTML behavior and security headers.

The browser contains only the Supabase project URL and public/publishable browser key. Server-side AI, PayPal and service-role credentials are not embedded in the website.

## 2. Supabase services

**Project:** `fxxjainrhtdezyzbqynn`  
**Region:** `us-west-2`  
**Database:** PostgreSQL 17

### Active Edge Functions

| Function | Version | Purpose |
|---|---:|---|
| `agent` | 36 | Authenticated AI assistant, provider health check and bounded directory lookup |
| `resource-search` | 21 | Public read-only published-catalogue search, counts, filters and home recommendations |
| `resource-outbound` | 16 | Resolves a published resource identifier to its stored official HTTPS host and logs minimal outbound events |
| `provider-introduction` | 15 | Retrieves limited provider-page metadata for a directory resource |
| `paypal-subscriptions` | 11 | Authenticated subscription preflight, creation and cancellation/return synchronization |
| `paypal-webhook` | 9 | PayPal webhook signature verification and event deduplication |

The six deployed function entrypoint files were compared with the corresponding release-branch sources on 18 November 2026. The updated `resource-search` v21 source was deployed after the recommendation changes and its active version/source flags were checked.

### Database

The public schema includes:

- Adult account profiles.
- Knowledge categories, resource records, resource/category mappings and provenance sources.
- Resource verification evidence and outbound-event records.
- Account-owned workspace state.
- Private institutional interest requests.
- PayPal subscription records and a service-role-only webhook idempotency ledger.

Row-level security is enabled on the observed public tables. The webhook ledger is intentionally not accessible to browser roles.

## 3. Home recommendation behavior

The updated release-branch front end sends the first explicit learning goal's category and the signed-in user's saved resource IDs to the recommendation endpoint.

The endpoint:
1. Validates the requested category slug and saved resource UUIDs.
2. Selects published provider records in the matching category when the category exists.
3. Excludes saved records when alternative records are available.
4. Falls back to a fresh published catalogue sample when no category-specific match exists.
5. Returns a maximum of six provider cards with no-store caching.

This is a transparent category match, not a machine-learning ranking, evaluation of provider quality, evidence review or age-suitability assessment. If the user has no matching goal, the service uses a fresh general catalogue sample.

## 4. Ask Einstein and documents

Ask Einstein uses an authenticated Supabase Edge Function and a server-side Groq-compatible provider configuration. The browser sends the prompt, bounded conversation history, and optional extracted document text.

Supported document extraction in the browser:
- PDF text, with page labels.
- DOCX text.
- TXT, Markdown and HTML text.

Limits: 15 MB per file, 40 PDF pages and 26,000 extracted characters. The original file is not uploaded to Supabase Storage. Extracted text is not persisted in chat history or cloud workspace state.

Not supported: OCR for scanned/image-only PDFs, embedded-image understanding, visual table/layout extraction, general open-web browsing, code execution, voice or image generation.

## 5. Data integrity and current limits

As of 18 November 2026, the live database contained 227 published resources, 24 active categories, 231 category mappings and 229 source records. The resource-verification-evidence table was empty; no provider had a reviewed learning-stage assignment. Listings are not independently vetted, accredited or endorsed.

Child accounts and parental-consent workflows, educator verification/class management, institutional accounts, SSO/LMS, district administration and signed DPA are not active. Journal and mood check-ins remain browser-local. Screen-time records only sessions started inside Einstein Minds.

## 6. Operational configuration

Server-side Supabase Edge Function secrets are used for:
- AI provider credentials (`GROQ_API_KEY` or compatible `LLM_API_KEY`, optionally `LLM_BASE_URL`).
- PayPal credentials, plan IDs, webhook ID, mode and application URL.

Never put these secrets into the front end, source package or Hostinger files. The public browser key is expected to be present in the static front end and is protected by Supabase RLS and Edge Function authorization design.

## 7. Known reproducibility and launch blockers

- All eight historical migration files and the four-part public catalogue seed are now present in the repository. A separate empty-project restore has not yet been executed, so bootstrap reproducibility is source-complete but not yet independently exercised.
- Supabase leaked-password protection is disabled according to the current security advisor.
- Production SMTP delivery is not yet confirmed.
- No PayPal subscription/webhook events have been recorded; the real sandbox lifecycle remains untested.
- Full signed-in browser E2E and cross-device accessibility QA remain outstanding.

See [RELEASE-CAPABILITY-MATRIX.md](RELEASE-CAPABILITY-MATRIX.md) for the verified product status and launch checklist.
