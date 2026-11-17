# Einstein Minds — Hostinger release update

## Live application changes

- Removed the synthetic resource generator and fake catalogue counts; the interface now waits for live Supabase category counts and provider records.
- Connected home recommendations and saved-provider actions to the live resource directory.
- Scoped saved providers to the signed-in account rather than a browser-global storage key.
- Added account-owned Supabase workspace sync for saved providers, goals, portfolio, assessment history, screen-time totals, preferences and activity events.
- Kept journal and mood entries device-local; child data is not synced.
- Connected the adult Educator Studio to Ask Einstein for AI-generated lesson drafts and portfolio saving.
- Replaced fictional child dashboards with adult family-planning tools and an explicit child-account lock.
- Added an authenticated institutional interest-request form stored in Supabase.
- Added AI provider readiness status and PayPal checkout preflight verification.
- Updated Terms, Privacy and child-safety notices to reflect currently available features.
- Added Hostinger SPA fallback, no-cache HTML delivery and security headers.

## Backend updates

- Added `user_workspaces` with owner-only RLS.
- Added `institutional_access_requests` with owner-only insert/read policies and explicit contact consent.
- Optimized the PayPal subscription read policy using a scalar `auth.uid()` call.
- Deployed the AI provider health check to `agent` and PayPal plan/webhook preflight to `paypal-subscriptions`.
- Added the temporary Hostinger origin to the resource and billing function CORS allow-lists.

## Current limits

- Child accounts and parental-consent verification remain disabled.
- Educator verification and institutional integrations are not active.
- Institutional interest requests are stored but do not trigger automatic email notifications.
- PayPal preflight validates configuration; a real sandbox purchase and webhook confirmation are still required.
- No independently reviewed resource-evidence rows are currently recorded.
