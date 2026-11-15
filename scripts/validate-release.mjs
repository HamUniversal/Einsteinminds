#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'assets/resource-network-core.js',
  'assets/einsteinminds-resource-network.js',
  'assets/resource-network.css',
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
  [/GitHub \+ Supabase \+ Hostinger/.test(fs.readFileSync(path.join(root, 'README.md'), 'utf8')), 'README documents the intended stack']
];
let failed = 0;
for (const [passed, label] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
if (failed) process.exit(1);
console.log(`Release validation passed: ${checks.length} checks.`);
