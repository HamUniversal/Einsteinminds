# Supabase — Einsteinminds

Project ref: `fxxjainrhtdezyzbqynn` (`Einsteinminds`, `us-west-2`).

The connected project already contains the resource-network schema, RLS policies, 24 active knowledge domains, 227 published provider records, 231 resource/category mappings and 229 provenance/source records. Verification evidence and reviewed learning-stage assignments are empty at the time of audit.

## Existing tables

`profiles`, `resource_categories`, `resources`, `resource_category_links`, `resource_sources`, `resource_verification_evidence`, `resource_outbound_events`.

RLS is enabled for all seven public tables. Anonymous users can read the public catalogue and insert only minimal outbound events; they cannot read profiles or write catalogue tables. Authenticated users can read their own profile and manage only that row. Catalogue writes are limited by RLS to JWT `app_metadata.role` values `admin` or `catalogue_editor`; user-editable `user_metadata` is not used for authorization. Outbound event insertion is constrained to a published resource and its stored official domain. These rules were exercised in rollback-only SQL role simulations.

## Active Edge Functions

- `agent` v10 — authenticated AI learning assistant; honest scripted fallback if no model provider is configured.
- `resource-search` v4 — catalogue search, category statistics, and learning-stage filtering.
- `resource-outbound` v3 — UUID-to-stored-URL resolution, official-host check, minimal event logging, and safe UTM tags.
- `provider-introduction` v2 — original official-page metadata retrieval and caching.

The frontend uses these existing deployed functions; this authentication hardening did not redeploy or modify any Edge Function.

## GitHub source-of-truth work still required

The Supabase project has these six migration entries:

- `20261115022622_resource_network_v1`
- `20261115022922_resource_policy_performance_hardening`
- `20261115023213_resource_category_counts_rpc`
- `20261115025852_resource_category_admin_and_count_fix`\n- `20261115180822_auth_least_privilege_grants`\n- `20261115180838_grant_authenticated_evidence_review`

The two authentication hardening migrations are included in this repository. The original four migration SQL files and exact deployed source for all four Edge Functions still need to be exported into GitHub before it can be the complete reproducible source of truth for the backend. Do not deploy reconstructed Edge Functions over the live versions.

Supabase Auth currently has one confirmed user and one profile. No `admin` or `catalogue_editor` app-metadata roles are assigned, so catalogue administration remains intentionally unavailable until a trusted administrator explicitly provisions a role. The security advisor reports leaked-password protection disabled; enable it in Supabase Authentication password settings (Pro plan or above).\n\nNever place `SUPABASE_SERVICE_ROLE_KEY` or any Supabase secret key in client code. The browser uses only the project URL and publishable key; Edge Functions keep server-side keys in Supabase-managed secrets.
