# Supabase Edge Functions

This directory records the Einstein Minds Edge Function source deployed to Supabase project \`fxxjainrhtdezyzbqynn\`. Keep source synchronized with the deployed project. Never commit secrets.

## Active functions (verified 17 November 2026)

| Function | Active version | JWT verification | Required configuration |
|---|---:|---|---|
| \`agent\` | 36 | Enabled | Supabase runtime keys and \`GROQ_API_KEY\` or \`LLM_API_KEY\`; optional \`LLM_BASE_URL\` |
| \`resource-search\` | 19 | Disabled | Supabase runtime URL and public key; public read-only catalogue search |
| \`resource-outbound\` | 16 | Disabled | Supabase runtime URL and public key; resolves only published resource IDs |
| \`provider-introduction\` | 15 | Enabled | Supabase runtime keys and server-side service-role key |
| \`paypal-subscriptions\` | 11 | Enabled | PayPal client ID/secret, monthly/yearly plan IDs, webhook ID, mode and app URL |
| \`paypal-webhook\` | 9 | Disabled | PayPal client ID/secret and webhook ID; verifies PayPal signatures before processing |

Supabase supplies \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\` and \`SUPABASE_SERVICE_ROLE_KEY\` to the Edge Function runtime. Do not put the service-role key in the browser, GitHub, or Hostinger static files.

## Hostinger origins

The user-facing app is hosted at \`https://einsteinminds.com\`. The resource and billing functions also accept HTTPS Hostinger preview subdomains ending in \`.hostingersite.com\` for preview testing. Local development uses \`http://localhost:8888\`.

## AI readiness

The \`agent\` function requires a valid signed-in Supabase user for all actions. Its \`health\` action verifies the configured OpenAI-compatible provider endpoint and API key without returning the secret. A successful HTTP response is not sufficient; the response must report \`ready: true\`.

## PayPal readiness

The \`paypal-subscriptions\` function's authenticated \`preflight\` action checks:
- PayPal client credentials;
- active monthly and annual plans at USD 8.00/month and USD 60.00/year;
- correct billing intervals;
- webhook URL and required event subscriptions.

A passing preflight verifies configuration only. A real sandbox checkout, approval, webhook delivery and subscription cancellation must still be tested before public launch.

## Security

- Keep JWT verification enabled for \`agent\`, \`provider-introduction\` and \`paypal-subscriptions\`.
- \`resource-outbound\` has JWT verification disabled at the edge; it accepts only a catalogue UUID, resolves a published record, enforces the stored official host, rejects arbitrary destinations, and applies CORS origin controls.
- \`resource-search\` is public but read-only and validates published-resource queries.
- \`paypal-webhook\` is public at the transport layer but independently verifies the PayPal webhook signature and deduplicates event IDs.
- Never add client access policies to \`paypal_webhook_events\`; it is intentionally private to the service role.
- The Supabase security advisor reports leaked-password protection disabled; enable it in Supabase Authentication before public launch.
