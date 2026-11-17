const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const billing = fs.readFileSync(path.join(root, 'supabase/functions/paypal-subscriptions/index.ts'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'supabase/functions/paypal-webhook/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261116153025_paypal_subscription_billing.sql'), 'utf8');

test('Pro checkout uses the authenticated server-side PayPal subscription function', () => {
  assert.match(html, /functions\.invoke\('paypal-subscriptions'/);
  assert.match(html, /action:'create'/);
  assert.match(html, /window\.location\.assign\(data\.approval_url\)/);
  const checkout = html.slice(html.indexOf('id="checkoutModal"'), html.indexOf('id="instReqModal"'));
  assert.doesNotMatch(checkout, /prototype|checkout unavailable|disabled/);
});

test('PayPal return is verified server-side before Pro access is refreshed', () => {
  assert.match(html, /action:'sync',subscription_id:id/);
  assert.match(html, /data\?\.status==='ACTIVE'/);
  assert.match(html, /plan:billing\?'pro':'free'/);
  assert.match(billing, /sub\.custom_id!==user\.id/);
  assert.match(billing, /paypal_subscription_id/);
});

test('monthly and annual prices map to distinct configured PayPal plans', () => {
  assert.match(html, /this\.cycle==='m'\?'monthly':'yearly'/);
  assert.match(billing, /PAYPAL_PLAN_MONTHLY_ID/);
  assert.match(billing, /PAYPAL_PLAN_YEARLY_ID/);
  assert.match(billing, /plan_id:config\.planId/);
});

test('PayPal webhook verifies signatures and deduplicates event IDs', () => {
  assert.match(webhook, /verify-webhook-signature/);
  assert.match(webhook, /verification_status==="SUCCESS"/);
  assert.match(webhook, /paypal_webhook_events/);
  assert.match(webhook, /BILLING\.SUBSCRIPTION\.ACTIVATED/);
  assert.match(webhook, /PAYMENT\.SALE\.COMPLETED/);
  assert.match(webhook, /BILLING\.SUBSCRIPTION\.CANCELLED/);
  assert.match(webhook, /PAYMENT_FAILED/);
  assert.match(webhook, /previous\?\.payment_status==="FAILED"/);
});

test('subscription records are private and users can only read their own row', () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\)\) = user_id/);
  assert.match(migration, /grant select on public\.paypal_subscriptions to authenticated/i);
  assert.match(migration, /revoke all on public\.paypal_subscriptions from anon, authenticated/i);
  assert.match(migration, /paypal_webhook_events/);
});

test('cancellation is sent to PayPal and does not trust a browser-only state change', () => {
  assert.match(html, /action:'cancel',subscription_id:sub\.paypal_subscription_id/);
  assert.match(billing, /\/cancel/);
  assert.match(webhook, /BILLING\.SUBSCRIPTION\.CANCELLED/);
});
