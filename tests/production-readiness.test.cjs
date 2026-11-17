const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('index.html');
const cloudKeysStart = html.indexOf('const CLOUD_STATE_KEYS=[');
const cloudKeysEnd = html.indexOf('];', cloudKeysStart);
const cloudKeysBlock = cloudKeysStart >= 0 && cloudKeysEnd > cloudKeysStart ? html.slice(cloudKeysStart, cloudKeysEnd) : '';

test('cloud workspace whitelist excludes device-only journal and mood entries', () => {
  assert.ok(cloudKeysBlock.length > 0);
  assert.ok(!cloudKeysBlock.includes('journal'));
  assert.ok(!cloudKeysBlock.includes('moods'));
  assert.ok(!cloudKeysBlock.includes('child'));
});

test('workspace and institutional request migration applies owner-only RLS', () => {
  const sql = read('supabase/migrations/20261117053941_user_workspace_and_institutional_requests.sql');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.user_workspaces'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.institutional_access_requests'));
  assert.ok(sql.includes('ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY'));
  assert.ok(sql.includes('ALTER TABLE public.institutional_access_requests ENABLE ROW LEVEL SECURITY'));
  assert.ok(sql.toLowerCase().includes('using ((select auth.uid()) = user_id)'));
  assert.ok(sql.includes('consent_to_contact = true'));
});

test('AI provider health check verifies the server-side model endpoint without exposing secrets', () => {
  const source = read('supabase/functions/agent/index.ts');
  assert.ok(source.includes('action==="health"'));
  assert.ok(source.includes('GROQ_API_KEY'));
  assert.ok(source.includes('base+"/models"'));
  assert.ok(source.includes('AI provider connection verified'));
  assert.ok(!source.includes('GROQ_API_KEY="') && !source.includes("GROQ_API_KEY='"));
});

test('PayPal preflight checks monthly, annual and webhook configuration', () => {
  const source = read('supabase/functions/paypal-subscriptions/index.ts');
  assert.ok(source.includes('action==="preflight"'));
  assert.ok(source.includes('PAYPAL_PLAN_MONTHLY_ID'));
  assert.ok(source.includes('PAYPAL_PLAN_YEARLY_ID'));
  assert.ok(source.includes('PAYPAL_WEBHOOK_ID'));
  assert.ok(source.includes('checkPlan(monthly,8,"MONTH","Monthly")'));
  assert.ok(source.includes('checkPlan(yearly,60,"YEAR","Annual")'));
  assert.ok(source.includes('v1/notifications/webhooks'));
  assert.ok(source.includes('BILLING.SUBSCRIPTION.ACTIVATED'));
  assert.ok(source.includes('PAYMENT.SALE.COMPLETED'));
});

test('Hostinger delivery has auth-route fallback, safe headers and no stale HTML cache', () => {
  const htaccess = read('.htaccess');
  assert.ok(htaccess.includes('RewriteRule ^ index.html [L]'));
  assert.ok(htaccess.includes('X-Content-Type-Options'));
  assert.ok(htaccess.includes('X-Frame-Options'));
  assert.ok(htaccess.includes('no-store, no-cache, must-revalidate'));
  assert.ok(htaccess.includes('max-age=3600'));
});

test('all historical migrations and public catalogue restore seeds are included', () => {
  const migrationPaths = [
    '20261115022622_resource_network_v1.sql',
    '20261115022922_resource_policy_performance_hardening.sql',
    '20261115023213_resource_category_counts_rpc.sql',
    '20261115025852_resource_category_admin_and_count_fix.sql',
    '20261115180822_auth_least_privilege_grants.sql',
    '20261115180838_grant_authenticated_evidence_review.sql',
    '20261116153025_paypal_subscription_billing.sql',
    '20261117053941_user_workspace_and_institutional_requests.sql'
  ];
  for (const file of migrationPaths) assert.ok(fs.existsSync(path.join(root, 'supabase/migrations', file)), 'missing migration ' + file);
  const categories = read('supabase/seed/00_resource_categories.sql');
  const resources = read('supabase/seed/01_resources.sql');
  const links = read('supabase/seed/02_resource_category_links.sql');
  const sources = read('supabase/seed/03_resource_sources.sql');
  const seedGuide = read('supabase/seed/README.md');
  assert.ok(categories.includes('jsonb_to_recordset'));
  assert.ok(resources.includes('jsonb_to_recordset'));
  assert.ok(links.includes('jsonb_to_recordset'));
  assert.ok(sources.includes('jsonb_to_recordset'));
  assert.ok(seedGuide.includes('227'));
  assert.ok(seedGuide.includes('231'));
  assert.ok(seedGuide.toLowerCase().includes('not an independently reviewed'));
  const seedMarker = (name) => String.fromCharCode(36) + name + String.fromCharCode(36);
  const seedRows = (source, name) => {
    const parts = source.split(seedMarker(name));
    assert.equal(parts.length, 3, 'valid embedded seed payload: ' + name);
    return JSON.parse(parts[1]);
  };
  const categoryRows = seedRows(categories, 'einstein_categories');
  const resourceRows = seedRows(resources, 'einstein_resource_rows');
  const mappingRows = seedRows(links, 'einstein_resource_links');
  const sourceRows = seedRows(sources, 'einstein_resource_sources');
  assert.equal(categoryRows.length, 24);
  assert.equal(resourceRows.length, 227);
  assert.equal(mappingRows.length, 231);
  assert.equal(sourceRows.length, 229);
  assert.ok(read('supabase/seed/99_verify.sql').includes('seed_counts_match_snapshot'));
  assert.ok(read('README.md').includes('separate empty Supabase project'));
});

test('repository documentation is Hostinger-only and records the security review follow-up', () => {
  const docs = ['README.md', 'README-HOSTINGER.md', 'START-HERE.md', 'SECURITY.md', 'supabase/README.md'].map(read).join(String.fromCharCode(10));
  assert.ok(docs.includes('Hostinger'));
  assert.ok(docs.toLowerCase().includes('leaked-password protection disabled'));
  assert.ok(docs.toLowerCase().includes('catalogue snapshot'));
  assert.ok(!docs.toLowerCase().includes('netlify'));
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.ok(html.includes('const RESOURCE_INDEX=[];'));
  assert.ok(!html.includes('MASTER UPGRADE PATCH v9.0'));
  assert.ok(!html.includes('MASTER PATCH v9.2'));
  assert.ok(!html.includes('VirtualDB'));
  assert.ok(!html.includes('iabFrame'));
  assert.ok(!html.includes('Stripe'));
  assert.ok(!html.includes('Simulated checkout'));
  assert.ok(!html.includes('COPPA 2026'));
  assert.ok(!html.includes('Verifiable Parental Consent'));
  assert.ok(html.includes('Child accounts are disabled'));
  assert.ok(html.includes('Institutional interest request'));
});
