const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('adult Supabase authentication and account-scoped workspace sync are wired', () => {
  assert.match(html, /supabaseClient\.auth\.signUp/);
  assert.match(html, /supabaseClient\.auth\.signInWithPassword/);
  assert.match(html, /supabaseClient\.auth\.resetPasswordForEmail/);
  assert.match(html, /emailRedirectTo:window\.location\.origin\+'\/'/);
  assert.match(html, /password\.length<12/);
  assert.match(html, /adultConfirm/);
  assert.match(html, /CloudState\.load\(authUser\.id\)/);
  assert.match(html, /from\('user_workspaces'\)/);
  assert.match(html, /workspace_dirty/);
  assert.match(html, /cloudSync/);
  assert.match(html, /supabaseClient\.auth\.signOut\(\{scope:'local'\}\)/);
});

test('Ask Einstein and Educator Studio use the real authenticated model function', () => {
  assert.match(html, /functions\.invoke\('agent'/);
  assert.match(html, /action:'health'/);
  assert.match(html, /async checkProvider\(\)/);
  assert.match(html, /async generate\(prompt\)/);
  assert.match(html, /Agent\.respond\(prompt,\[\]\)/);
  assert.match(html, /saveLast\(\)/);
  assert.match(html, /AI connection:/);
});

test('PayPal checkout is gated by server-side plan and webhook preflight', () => {
  assert.match(html, /functions\.invoke\('paypal-subscriptions'/);
  assert.match(html, /action:'preflight'/);
  assert.match(html, /plan_key:this\.cycle==='m'\?'monthly':'yearly'/);
  assert.match(html, /c==='m'\?'\$8':'\$60'/);
  assert.match(html, /this\.cycle==='m'\?'\$8\.00':'\$60\.00'/);
  assert.match(html, /id="coPay" onclick="Plans\.pay\(\)"/);
  assert.match(html, /action:'cancel'/);
  assert.match(html, /action:'sync'/);
});

test('the interface does not invent child accounts or institutional integrations', () => {
  assert.doesNotMatch(html, /const CHILDREN\s*=/);
  assert.doesNotMatch(html, /child:'Maya'/);
  assert.match(html, /Child accounts are disabled/);
  assert.match(html, /Institutional integrations are not active/);
  assert.match(html, /Inst\.submitRequest/);
  assert.match(html, /institutional_access_requests/);
  assert.match(html, /consent_to_contact:true/);
});

test('provider directory and saved resources are live, not a synthetic seed catalogue', () => {
  assert.match(html, /const RESOURCE_INDEX=\[\]/);
  assert.match(html, /function poolFor\(cid\)\{return \[\]\}/);
  assert.match(html, /renderHomeRecommendations/);
  assert.match(html, /live provider listings/);
  const network = fs.readFileSync(path.join(root, 'assets/einsteinminds-resource-network.js'), 'utf8');
  assert.match(network, /Auth\.signedIn/);
  assert.match(network, /S\.saved/);
  assert.match(network, /persist\(\)/);
  assert.doesNotMatch(network, /localStorage\.getItem\(SAVED_KEY\)/);
});

test('privacy, screen-time and unavailable service disclosures are accurate', () => {
  assert.match(html, /Journal entries, mood check-ins and some interface preferences remain in this browser/);
  assert.match(html, /This timer records only sessions you start inside Einstein Minds/);
  assert.match(html, /does not monitor other apps, devices or children/);
  assert.match(html, /No compliance certification is claimed/);
  assert.match(html, /Educator verification and educator-specific services are not yet available/);
  assert.match(html, /No SSO or LMS integration yet/);
  assert.doesNotMatch(html, /Simulated checkout|Stripe|COPPA 2026|verified educational sources/i);
});
