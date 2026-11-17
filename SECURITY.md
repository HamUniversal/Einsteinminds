# Security Policy

## Reporting a vulnerability

Do not publish exploitable details in a public issue. Report suspected vulnerabilities to the security contact listed on the Einstein Minds website. Include a concise description, affected URL or component, reproduction steps and potential impact. Do not include passwords, API keys, access tokens or real learner data.

## Current security boundaries

- Einstein Minds currently supports adult accounts only. Child accounts, child AI access and parental-consent workflows are disabled.
- The browser uses the Supabase project URL and public publishable key only. Service-role keys, AI provider keys and PayPal credentials must remain in Supabase Edge Function secrets.
- Supabase Row Level Security restricts profiles, account workspaces, subscriptions and institutional requests to their owner.
- The PayPal webhook ledger is server-side only. It has no client policies or client grants.
- Saved providers, learning goals, portfolio items, assessment history, screen-time totals, preferences and learning events can sync to the signed-in account when cloud sync is enabled. Journal and mood entries remain device-local.
- Resource listings are external catalogue entries. They are not independently reviewed or endorsed.
- Hostinger security headers and route fallback are configured in `.htaccess`. A Content Security Policy has not yet been enabled.

## Security follow-up

The Supabase security advisor reports leaked-password protection disabled. Enable it in Supabase Authentication password settings before public launch. Configure production SMTP for account confirmation and password recovery. Review the complete privacy and safeguarding model before enabling child-facing or institutional services.

## Responsible disclosure

Please report any issue that could expose account data, billing information or personal information promptly. Do not test against real learner records.
