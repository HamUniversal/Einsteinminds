# Supabase — Einsteinminds

Project ref: `fxxjainrhtdezyzbqynn` (`Einsteinminds`, `us-west-2`).

The connected project already contains the resource-network schema, RLS policies, 24 active knowledge domains, 227 published provider records, 231 resource/category mappings and 229 provenance/source records. Verification evidence and reviewed learning-stage assignments are empty at the time of audit.

## Existing tables

`profiles`, `resource_categories`, `resources`, `resource_category_links`, `resource_sources`, `resource_verification_evidence`, `resource_outbound_events`.

RLS is enabled for the observed tables. Public reads are scoped to published resources and active categories. Catalogue writes are reserved for roles in `app_metadata` (`admin` / `catalogue_editor`). Outbound event insertion is constrained to a published resource and its stored official domain.

## Active Edge Functions

- `agent` v10 — authenticated AI learning assistant; honest scripted fallback if no model provider is configured.
- `resource-search` v3 — catalogue search, category statistics, and learning-stage filtering.
- `resource-outbound` v2 — UUID-to-stored-URL resolution, official-host check, minimal event logging, and safe UTM tags.
- `provider-introduction` v1 — original official-page metadata retrieval and caching.

The frontend patch uses these existing deployed functions and does not redeploy or modify them. It also does not apply a database migration.

## GitHub source-of-truth work still required

The Supabase project has these four migration entries:

- `20261115022622_resource_network_v1`
- `20261115022922_resource_policy_performance_hardening`
- `20261115023213_resource_category_counts_rpc`
- `20261115025852_resource_category_admin_and_count_fix`

Their SQL source files and the exact currently deployed source for all four Edge Functions have not yet been exported into this repository. Export those exact deployed files from Supabase before changing backend behavior. Do not write guessed replacement migrations or deploy a newly reconstructed function over a working production function.

Never place `SUPABASE_SERVICE_ROLE_KEY` or any Supabase secret key in client code. The browser uses only the project URL and publishable key; Edge Functions keep server-side keys in Supabase-managed secrets.
