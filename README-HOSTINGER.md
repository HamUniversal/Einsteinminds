# Hostinger deployment — Einstein Minds

**Target:** https://einsteinminds.com  
**Hosting type:** Hostinger static website  
**Upload location:** `public_html`

## Upload

1. Back up the current `public_html` contents.
2. Upload the Einstein Minds release ZIP.
3. Extract it directly into `public_html`.
4. Confirm these paths exist:
   - `public_html/index.html`
   - `public_html/.htaccess`
   - `public_html/assets/resource-network-core.js`
   - `public_html/assets/einsteinminds-resource-network.js`
   - `public_html/assets/resource-network.css`
   - `public_html/assets/auth-route-guard.js`
5. Visit https://einsteinminds.com and hard-refresh.

**Do not** create a Node.js app, set a build command or add Supabase secrets to Hostinger. The frontend is static; all server-side secrets remain in Supabase Edge Function secrets.

## Before testing accounts and payments

In Supabase Authentication:
- Site URL: `https://einsteinminds.com`
- Redirect allow-list: `https://einsteinminds.com/**`
- Add the www URL only if you use it.
- Add the temporary Hostinger domain only if you test there.
- Configure production SMTP for confirmation and password-reset emails.
- Enable leaked-password protection.

In Supabase Edge Function secrets, verify:
- AI: `GROQ_API_KEY` (or `LLM_API_KEY`); optional `LLM_BASE_URL`.
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_MONTHLY_ID`, `PAYPAL_PLAN_YEARLY_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE` and `APP_URL`.

After sign-in, the AI status indicator checks the configured model provider. When opening Pro checkout, the app checks that PayPal has valid credentials, an active USD $8 monthly plan, an active USD $60 annual plan and the required webhook endpoint/events.

A successful preflight is not a completed payment test. Run one PayPal sandbox purchase, verify the webhook updates the subscription row, then cancel the sandbox subscription before enabling live billing.
