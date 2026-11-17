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

The directory, Supabase adult-account authentication, account workspace sync, AI lesson drafting and institutional interest-request storage are connected. Actual AI availability depends on the server-side model key. PayPal checkout is enabled only when the server-side preflight succeeds and still requires a real sandbox purchase test.

Child accounts, educator verification, institutional integrations, voice, image generation, code execution, document tools and virtual laboratories are not currently offered. Journal and mood entries remain on the current device.
