# Supabase — Einsteinminds

Project ref: `fxxjainrhtdezyzbqynn` (`Einsteinminds`, `us-west-2`).

The connected project already contains the resource-network schema, RLS policies, 24 active knowledge domains, 227 published provider records, 231 resource/category mappings and 229 provenance/source records. Verification evidence and reviewed learning-stage assignments are empty at the time of audit.

## Existing tables

`profiles`, `resource_categories`, `resources`, `resource_category_links`, `resource_sources`, `resource_verification_evidence`, `resource_outbound_events`.

RLS is enabled for all seven public tables. Anonymous users can read the public catalogue and insert only minimal outbound events; they cannot read profiles or write catalogue tables. Authenticated users can read their own profile and manage only that row. Catalogue writes are limited by RLS to JWT `app_metadata.role` values `admin` or `catalogue_editor`; user-editable `user_metadata` is not used for authorization. Outbound event insertion is constrained to a published resource and its stored official domain. These rules were exercised in rollback-only SQL role simulations.

## Active Edge Functions

- `agent` v36 — authenticated Groq learning assistant with Einstein Minds directory search, provider metadata, and extracted-document context.
- `resource-search` v19 — catalogue search, category statistics, and learning-stage filtering.
- `resource-outbound` v16 — UUID-to-stored-URL resolution, official-host check, minimal event logging, and safe UTM tags.
- `provider-introduction` v15 — controlled official-page metadata retrieval and caching.

## Ask Einstein document text analysis

- The frontend supports PDF, DOCX, TXT, Markdown, and HTML attachments.
- PDF.js 6.5.438 extracts text by page; Mammoth 1.13.0 extracts DOCX text. Plain-text and HTML files are read in the browser.
- Limits: 15 MB per file, 40 PDF pages, and 26,000 extracted characters per request.
- Extracted text is sent to the authenticated `agent` function as untrusted document context. The backend caps document context at 28,000 characters and reduces recent chat history for document requests to stay within the request-size limit.
- File bytes and extracted text are not stored in Supabase Storage or a document table. Saved chat history stores the user's prompt and answer, not the document contents.
- OCR for scanned PDFs, embedded-image understanding, and reliable visual/table-layout analysis are not included in this first implementation.

The live Supabase project also has `paypal-subscriptions` v11 and `paypal-webhook` v9 active. The `agent` Edge Function is deployed as v36 with `verify_jwt=true`; its deployed source is synchronized to `supabase/functions/agent/index.ts` in this branch. The frontend document-attachment implementation is committed to `feature/ask-einstein-groq-agent` and is not live on the production website until the frontend branch is reviewed and deployed through Hostinger.

## GitHub source-of-truth work still required

The Supabase project has these six migration entries:

- `20261115022622_resource_network_v1`
- `20261115022922_resource_policy_performance_hardening`
- `20261115023213_resource_category_counts_rpc`
- `20261115025852_resource_category_admin_and_count_fix`\n- `20261115180822_auth_least_privilege_grants`\n- `20261115180838_grant_authenticated_evidence_review`

The two authentication hardening migrations are included in this repository. The original four migration SQL files and exact deployed source for all four Edge Functions still need to be exported into GitHub before it can be the complete reproducible source of truth for the backend. Do not deploy reconstructed Edge Functions over the live versions.

Supabase Auth currently has one confirmed user and one profile. No `admin` or `catalogue_editor` app-metadata roles are assigned, so catalogue administration remains intentionally unavailable until a trusted administrator explicitly provisions a role. The security advisor reports leaked-password protection disabled; enable it in Supabase Authentication password settings (Pro plan or above).\n\nNever place `SUPABASE_SERVICE_ROLE_KEY` or any Supabase secret key in client code. The browser uses only the project URL and publishable key; Edge Functions keep server-side keys in Supabase-managed secrets.
