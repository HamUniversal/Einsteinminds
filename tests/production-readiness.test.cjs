const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('index.html');

test('workspace and institutional request migration applies owner-only RLS', () => {
  const sql = read('supabase/migrations/20261117053941_user_workspace_and_institutional_requests.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.user_workspaces/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.institutional_access_requests/);
  assert.match(sql, /ALTER TABLE public\.user_workspaces ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE public\.institutional_access_requests ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /\(SELECT auth\.uid\(\)\) = user_id/);
  assert.match(sql, /consent_to_contact = true/);
});

test('AI provider health check verifies the server-side model endpoint without exposing secrets', () => {
  const source = read('supabase/functions/agent/index.ts');
  assert.match(source, /action==="health"/);
  assert.match(source, /GROQ_API_KEY/);
  assert.match(source, /base\+"\/models"/);
  assert.match(source, /AI provider connection verified/);
  assert.doesNotMatch(source, /GROQ_API_KEY\s*[:=]\s*["'][^"']+["']/);
});

test('PayPal preflight checks monthly, annual and webhook configuration', () => {
  const source = read('supabase/functions/paypal-subscriptions/index.ts');
  assert.match(source, /action==="preflight"/);
  assert.match(source, /PAYPAL_PLAN_MONTHLY_ID/);
  assert.match(source, /PAYPAL_PLAN_YEARLY_ID/);
  assert.match(source, /PAYPAL_WEBHOOK_ID/);
  assert.match(source, /checkPlan\(monthly,8,"MONTH","Monthly"\)/);
  assert.match(source, /checkPlan\(yearly,60,"YEAR","Annual"\)/);
  assert.match(source, /v1\/notifications\/webhooks/);
  assert.match(source, /BILLING\.SUBSCRIPTION\.ACTIVATED/);
  assert.match(source, /PAYMENT\.SALE\.COMPLETED/);
});

test('Hostinger delivery has auth-route fallback, safe headers and no stale HTML cache', () => {
  const htaccess = read('.htaccess');
  assert.match(htaccess, /RewriteRule \^ index\.html \[L\]/);
  assert.match(htaccess, /X-Content-Type-Options/);
  assert.match(htaccess, /X-Frame-Options/);
  assert.match(htaccess, /no-store, no-cache, must-revalidate/);
  assert.match(htaccess, /max-age=3600/);
});

test('repository documentation is Hostinger-only and discloses the migration-source gap', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /original four resource-network migration SQL files/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
