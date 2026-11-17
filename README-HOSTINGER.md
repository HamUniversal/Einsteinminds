# Hostinger deployment — Einstein Minds

**Production URL:** https://einsteinminds.com  
**Hosting type:** Static HTML, CSS and JavaScript  
**Upload location:** `public_html`

## Choose the correct ZIP

Use the **Hostinger upload ZIP** for the website. It contains `index.html`, `.htaccess` and the `assets/` directory at its root.

The **repository source ZIP** is for developers and auditing. Do not upload that source archive into `public_html`.

## Deploy the Hostinger ZIP

1. Back up the existing `public_html` contents.
2. Upload the Hostinger upload ZIP through Hostinger File Manager.
3. Extract it directly into `public_html`.
4. Confirm these paths are directly inside `public_html`:
   - `index.html`
   - `.htaccess`
   - `assets/resource-network-core.js`
   - `assets/einsteinminds-resource-network.js`
   - `assets/resource-network.css`
   - `assets/auth-route-guard.js`
5. Do not leave the files inside an additional nested folder.
6. Open https://einsteinminds.com and hard-refresh.

**Do not** create a Node.js app, configure a build command, or add Supabase server secrets to Hostinger. The front end is static. Server-side keys stay in Supabase Edge Function secrets.

## Supabase configuration

In Supabase Authentication:
- Site URL: `https://einsteinminds.com`
- Redirect allow-list: `https://einsteinminds.com/**`
- Add the www or temporary Hostinger origin only if it is actually used.
- Configure production SMTP for account confirmation and password recovery.
- Enable leaked-password protection before public launch.

In Supabase Edge Function secrets, verify:
- AI: `GROQ_API_KEY` (or `LLM_API_KEY`); optional `LLM_BASE_URL`.
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_MONTHLY_ID`, `PAYPAL_PLAN_YEARLY_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE` and `APP_URL`.

Never put `SUPABASE_SERVICE_ROLE_KEY`, AI keys or PayPal secrets into the browser, GitHub source, or Hostinger static files.

## What is connected

- Adult Supabase signup, sign-in, password recovery and protected routes.
- Live directory search, goal-category home suggestions and controlled outbound provider links.
- Ask Einstein AI when the configured server-side model provider is healthy.
- Browser-side text extraction for PDF, DOCX, TXT, Markdown and HTML attachments, with bounded extracted text sent to the authenticated agent.

## Important limits and launch checks

Child accounts and parental-consent workflows, educator verification, institutional SSO/LMS/district administration, scanned-PDF OCR, embedded-image analysis, voice, image generation, code execution and virtual laboratories are not currently offered. The directory currently has 227 published records and zero independent verification-evidence records.

A successful AI health check does not replace a real signed-in prompt test. A PayPal preflight does not prove payment completion. Before enabling live billing, complete a sandbox subscription purchase, webhook delivery, database status check and cancellation. Confirm production SMTP delivery for account confirmation and password recovery.
