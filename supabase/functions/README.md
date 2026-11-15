# Supabase Edge Functions

This directory records the source currently deployed to the Einsteinminds Supabase project (`fxxjainrhtdezyzbqynn`). It is maintained for reproducible review and deployment. Do not commit secret values.

## Functions and runtime settings

| Function | Deployed version at export | JWT verification | Required secrets/config |
|---|---:|---|---|
| `agent` | 10 | enabled | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LLM_API_KEY`; optional `LLM_BASE_URL`, `LLM_MODEL` |
| `resource-search` | 5 | disabled; public catalogue read only | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `resource-outbound` | 3 | disabled; validates published resource IDs and resolves destinations from the database | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `provider-introduction` | 2 | disabled; public metadata refresh for published resource IDs | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

Supabase supplies the project URL and public/anon key in the Edge Function runtime. Configure any provider credentials through Supabase Edge Function Secrets, never in browser code or Git. The service-role key must remain server-side only.

## Deployment caution

- Review each function and its authorization/CORS behavior before deploying.
- Keep `agent` JWT verification enabled.
- The three public functions deliberately perform limited public catalogue operations. Do not add account or administrative operations to them without explicit authentication and authorization checks.
- The AI function returns a clearly labelled scripted fallback when the LLM secret/provider is unavailable; a successful HTTP response does not prove a live model answered.
- Verify logs and real responses after each deployment. Do not use a real child account for staging tests.

## Reproducibility gap

The database currently records six applied migrations. Only the two authentication-hardening migrations are present in this repository at this revision. The four earlier resource-network migrations still need their exact SQL source recovered and committed; do not reconstruct them from names alone.
