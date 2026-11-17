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
  for (const file of migrationPaths) assert.ok(fs.existsSync(path.join(root,'supabase/migrations',file)), 'missing migration '+file);
  const categories = read('supabase/seed/00_resource_categories.sql');
  const resources = read('supabase/seed/01_resources.sql');
  const links = read('supabase/seed/02_resource_category_links.sql');
  const sources = read('supabase/seed/03_resource_sources.sql');
  const seedGuide = read('supabase/seed/README.md');
  assert.match(categories, /jsonb_to_recordset/);
  assert.match(resources, /jsonb_to_recordset/);
  assert.match(links, /jsonb_to_recordset/);
  assert.match(sources, /jsonb_to_recordset/);
  assert.match(seedGuide, /227/);
  assert.match(seedGuide, /231/);
  assert.match(seedGuide, /not an independently reviewed/i);
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
  assert.match(read('supabase/seed/99_verify.sql'), /seed_counts_match_snapshot/);
  assert.match(read('README.md'), /separate empty Supabase project/);
});

test('repository documentation is Hostinger-only and records the remaining security follow-up', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /catalogue snapshot/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
)[1]);
  const resourceRows = JSON.parse(resources.split('$einstein_resource_rows
  assert.match(read('README.md'), /separate empty Supabase project/);
});

test('repository documentation is Hostinger-only and records the remaining security follow-up', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /catalogue snapshot/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
)[1]);
  const mappingRows = JSON.parse(links.split('$einstein_resource_links
  assert.match(read('README.md'), /separate empty Supabase project/);
});

test('repository documentation is Hostinger-only and records the remaining security follow-up', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /catalogue snapshot/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
)[1]);
  const sourceRows = JSON.parse(sources.split('$einstein_resource_sources
  assert.match(read('README.md'), /separate empty Supabase project/);
});

test('repository documentation is Hostinger-only and records the remaining security follow-up', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /catalogue snapshot/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
)[1]);
  assert.equal(categoryRows.length, 24);
  assert.equal(resourceRows.length, 227);
  assert.equal(mappingRows.length, 231);
  assert.equal(sourceRows.length, 229);
  assert.match(read('supabase/seed/99_verify.sql'), /seed_counts_match_snapshot/);
  assert.match(read('README.md'), /separate empty Supabase project/);
});

test('repository documentation is Hostinger-only and records the remaining security follow-up', () => {
  const docs = ['README.md','README-HOSTINGER.md','START-HERE.md','SECURITY.md','supabase/README.md'].map(read).join('\n');
  assert.match(docs, /Hostinger/);
  assert.match(docs, /leaked-password protection disabled/i);
  assert.match(docs, /catalogue snapshot/i);
  assert.doesNotMatch(docs, /Netlify/i);
});

test('production app contains no legacy fake catalogue, Stripe checkout or child verification workflow', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|VirtualDB|iabFrame/);
  assert.doesNotMatch(html, /Stripe|Simulated checkout|COPPA 2026|Verifiable Parental Consent/i);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional interest request/);
});
