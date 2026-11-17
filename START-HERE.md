# Start here — Einstein Minds Hostinger release

**The only deployment target is Hostinger.** The production domain is https://einsteinminds.com.

## Upload the release ZIP

1. Open Hostinger hPanel → Websites → Manage → File Manager.
2. Open `public_html` and download a backup of the current files.
3. Upload the Einstein Minds Hostinger release ZIP.
4. Extract the ZIP directly into `public_html`.
5. Confirm `index.html`, `.htaccess` and the `assets/` folder are at the root of `public_html`.
6. Open https://einsteinminds.com and hard-refresh.

This is a static HTML/CSS/JavaScript website. Do not create a Node.js web app, set a build command or add secrets to Hostinger.

## Supabase checks

- Site URL: `https://einsteinminds.com`
- Redirect allow-list: `https://einsteinminds.com/**`
- Add the www or temporary Hostinger URL only if you actually use those hosts.
- Configure production SMTP for confirmation and password-reset emails.
- Enable leaked-password protection.
- Set server-side AI and PayPal secrets in Supabase Edge Function secrets, never in the browser.

After signing in, the AI status indicator checks the model provider. Opening Pro checkout runs a PayPal preflight that checks credentials, both plan prices/intervals and the webhook endpoint/events.

## Important release limits

The directory, Supabase adult-account authentication, account workspace sync, Ask Einstein text analysis, AI lesson drafting and institutional interest-request storage are connected. Recommended For You uses a learning-goal category match when one is available; it is not an independently verified ranking. Actual AI availability depends on the server-side model key. PayPal checkout is enabled only when the server-side preflight succeeds and still requires a real sandbox purchase test.

Child accounts and parental-consent workflows, educator verification and class management, institutional integrations/SSO/LMS, voice, image analysis, code execution, data visualization and virtual laboratories are not currently offered. Ask Einstein document text analysis is available for PDF, DOCX, TXT, Markdown and HTML (15 MB, 40 PDF pages and 26,000 extracted characters per request); scanned-PDF OCR and embedded-image/layout analysis are not supported. Journal and mood entries remain on the current device.
