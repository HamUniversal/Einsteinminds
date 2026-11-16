const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

test('Supabase Auth signup and sign-in remain wired to the live client', () => {
  assert.match(html, /supabaseClient\.auth\.signUp/);
  assert.match(html, /supabaseClient\.auth\.signInWithPassword/);
  assert.match(html, /emailRedirectTo:window\.location\.origin\+'\/'/);
  assert.match(html, /password\.length<12/);
  assert.match(html, /adultConfirm/);
  assert.match(html, /supabaseClient\.auth\.signOut\(\{scope:'local'\}\)/);
});

test('PayPal checkout supports both configured subscription intervals', () => {
  assert.match(html, /functions\.invoke\('paypal-subscriptions'/);
  assert.match(html, /plan_key:this\.cycle==='m'\?'monthly':'yearly'/);
  assert.match(html, /this\.cycle==='m'\?'\$8':'\$60'/);
  assert.match(html, /this\.cycle==='m'\?'\$8\.00':'\$60\.00'/);
  assert.match(html, /id="coPay" onclick="Plans\.pay\(\)"/);
  assert.match(html, /action:'cancel'/);
  assert.match(html, /action:'sync'/);
});

test('production-facing copy does not misrepresent connected services as a prototype', () => {
  for (const stale of [
    'Create staging account',
    'Staging sign in',
    'Checkout is unavailable in this prototype',
    'Prototype profile only: profile data stays in this browser',
    'educational platform prototype with sample data and local-only profiles'
  ]) assert.equal(html.includes(stale), false, 'stale copy remains: ' + stale);

  assert.match(html, /Account sign-in is provided by Supabase/);
  assert.match(html, /PayPal checkout requires configured billing credentials and subscription plans/);
  assert.match(html, /Provider listings are not independently reviewed/);
});

test('unavailable features remain explicitly disclosed rather than falsely advertised', () => {
  assert.match(html, /Educator verification and educator services are not yet available/);
  assert.match(html, /Institutional services, integrations and district administration are not yet available/);
  assert.match(html, /No parental-consent provider is connected/);
  assert.match(html, /Additional tools are not yet connected/);
});
