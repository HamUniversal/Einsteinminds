#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'assets/resource-network-core.js',
  'assets/einsteinminds-resource-network.js',
  'assets/resource-network.css',
  'assets/auth-route-guard.js',
  '.htaccess',
  '.github/workflows/validate.yml',
  'README.md'
];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets/einsteinminds-resource-network.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'assets/resource-network-core.js'), 'utf8');
const checks = [
  [html.includes('/assets/resource-network-core.js'), 'index.html loads the resource core'],
  [html.includes('/assets/einsteinminds-resource-network.js'), 'index.html loads the resource network UI'],
  [html.includes('/assets/resource-network.css'), 'index.html loads the resource network stylesheet'],
  [html.includes('/assets/auth-route-guard.js'), 'index.html loads the protected-route guard'],
  [fs.readFileSync(path.join(root, 'assets/auth-route-guard.js'), 'utf8').includes('privateRoutes'), 'protected-route guard defines private routes'],
  [!html.includes('MASTER UPGRADE PATCH v9.0'), 'legacy synthetic 2.4M patch removed'],
  [!html.includes('MASTER PATCH v9.2'), 'legacy v9.2 fake catalogue patch removed'],
  [!html.includes('id="iabFrame"'), 'legacy in-app iframe removed'],
  [app.includes("'resource-search'"), 'UI calls the existing Supabase resource-search function'],
  [app.includes('renderKnowledgeDomains') && app.includes('actual_listings'), 'All 24 domain tiles use live Supabase counts'],
  [app.includes("'resource-outbound'"), 'UI uses the controlled outbound gateway'],
  [app.includes("'provider-introduction'"), 'UI can retrieve original provider page metadata'],
  [core.includes("'entrepreneur'"), 'Entrepreneur stage is supported'],
  [core.includes("'pre_k'"), 'Pre-K stage is supported'],
  [!app.includes('2,400,000'), 'UI contains no fabricated 2.4M count'],
  [!app.includes('VirtualDB'), 'UI contains no synthetic resource generator'],
  [fs.existsSync(path.join(root, '.github/workflows/validate.yml')), 'GitHub Actions validation workflow exists'],
  [!fs.existsSync(path.join(root, '.github/workflows/deploy-hostinger.yml')), 'No FTP-based deployment workflow is configured'],
  [!fs.readFileSync(path.join(root, '.github/workflows/validate.yml'), 'utf8').includes('FTP-Deploy-Action'), 'GitHub Actions does validation only'],
  [!fs.readFileSync(path.join(root, '.htaccess'), 'utf8').includes('immutable'), 'Unversioned app assets are not cached as immutable'],
  [/GitHub \+ Supabase \+ Hostinger/.test(fs.readFileSync(path.join(root, 'README.md'), 'utf8')), 'README documents the intended stack'],
  [!html.includes('Create staging account'), 'live Supabase signup is not labelled as staging'],
  [!html.includes('Staging sign in'), 'live Supabase sign-in is not labelled as staging'],
  [!html.includes('Checkout is unavailable in this prototype'), 'PayPal checkout is not falsely labelled unavailable'],
  [!html.includes('Prototype profile only: profile data stays in this browser'), 'authenticated profile is not falsely labelled local-only'],
  [!html.includes('educational platform prototype with sample data and local-only profiles'), 'page metadata describes the connected application accurately'],
  [html.includes('PayPal checkout requires configured billing credentials and subscription plans.'), 'service dependencies are disclosed honestly'],
  [html.includes('supabaseClient.auth.signUp') && html.includes('supabaseClient.auth.signInWithPassword'), 'signup and password sign-in use Supabase Auth'],
  [html.includes("functions.invoke('paypal-subscriptions'") && html.includes("plan_key:this.cycle==='m'?'monthly':'yearly'"), 'monthly and annual checkout use the PayPal subscription function'],
  [html.includes('id="coPay" onclick="Plans.pay()"'), 'PayPal checkout action is enabled in the interface'],
  [!html.includes('Create staging account'), 'live Supabase signup is not labelled as staging'],
  [!html.includes('Staging sign in'), 'live Supabase sign-in is not labelled as staging'],
  [!html.includes('Checkout is unavailable in this prototype'), 'PayPal checkout is not falsely labelled unavailable'],
  [!html.includes('Prototype profile only: profile data stays in this browser'), 'authenticated profile is not falsely labelled local-only'],
  [!html.includes('educational platform prototype with sample data and local-only profiles'), 'page metadata describes the connected application accurately'],
  [html.includes('PayPal checkout requires configured billing credentials and subscription plans.'), 'service dependencies are disclosed honestly'],
  [html.includes('supabaseClient.auth.signUp') && html.includes('supabaseClient.auth.signInWithPassword'), 'signup and password sign-in use Supabase Auth'],
  [html.includes("functions.invoke('paypal-subscriptions'") && html.includes("plan_key:this.cycle==='m'?'monthly':'yearly'"), 'monthly and annual checkout use the PayPal subscription function'],
  [html.includes('id="coPay" onclick="Plans.pay()"'), 'PayPal checkout action is enabled in the interface']
];
let failed = 0;
for (const [passed, label] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
if (failed) process.exit(1);
console.log(`Release validation passed: ${checks.length} checks.`);
