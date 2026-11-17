# Hostinger manual ZIP deployment — Einstein Minds

**Production site:** https://einsteinminds.com  
**Hosting type:** static HTML/CSS/JavaScript  
**Upload target:** `public_html`

## Upload the release

1. Open Hostinger hPanel → **Websites** → `einsteinminds.com` → **Manage**.
2. Open **File Manager** and enter `public_html`.
3. Download a backup of the current files before replacing anything.
4. Upload the generated Einstein Minds Hostinger release ZIP.
5. Extract it directly into `public_html`.
6. Confirm `index.html`, `.htaccess` and the `assets/` folder are directly inside `public_html`, not inside a nested directory.
7. Open https://einsteinminds.com and hard-refresh the browser.

This is a static website. Do not create a Node.js Web App, set a build command, or add server-side secrets to Hostinger.

## Required files

- `index.html`
- `.htaccess`
- `assets/resource-network-core.js`
- `assets/einsteinminds-resource-network.js`
- `assets/resource-network.css`
- `assets/auth-route-guard.js`

## Supabase configuration

The frontend contains only the Supabase project URL and publishable key. All private secrets remain in Supabase Edge Function secrets.

Auth:
- Site URL: `https://einsteinminds.com`
- Redirect allow-list: `https://einsteinminds.com/**`
- Add the www or temporary Hostinger domain only if you actually use it.
- Configure production SMTP for confirmation and password-reset emails.
- Enable leaked-password protection.

AI:
- Set `GROQ_API_KEY` or `LLM_API_KEY` in Supabase Edge Function secrets.
- Optionally set `LLM_BASE_URL` for an OpenAI-compatible HTTPS provider.
- After sign-in, the AI status indicator checks the configured provider key and its `/models` endpoint.

PayPal:
- Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_MONTHLY_ID`, `PAYPAL_PLAN_YEARLY_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE` and `APP_URL` in Supabase Edge Function secrets.
- The app checks that the monthly plan is active at USD $8/month, the annual plan is active at USD $60/year, and the webhook URL/events are correct.
- A passing preflight is not a completed payment test. Run a sandbox purchase, verify the webhook updates Supabase, then cancel the sandbox subscription before live billing.

## Rollback

Keep the backup until registration, email confirmation, password recovery, account sync, resource search, AI and PayPal sandbox checkout have been tested. If a release fails, restore the backed-up `public_html` files.
