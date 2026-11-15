#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const assetsDir = path.join(root, 'assets');
const corePath = path.join(assetsDir, 'resource-network-core.js');
const appPath = path.join(assetsDir, 'einsteinminds-resource-network.js');
const cssPath = path.join(assetsDir, 'resource-network.css');
const guardPath = path.join(assetsDir, 'auth-route-guard.js');
const hostingerReadmePath = path.join(root, 'README-HOSTINGER.md');

function fail(message) {
  console.error(`Update not applied: ${message}`);
  process.exit(1);
}

for (const required of [indexPath, corePath, appPath, cssPath, guardPath, hostingerReadmePath]) {
  if (!fs.existsSync(required)) fail(`Required file not found: ${path.relative(root, required)}`);
}

let html = fs.readFileSync(indexPath, 'utf8');
const bodyClose = html.toLowerCase().lastIndexOf('</body>');
const headClose = html.toLowerCase().indexOf('</head>');
if (bodyClose < 0) fail('index.html has no closing </body> tag.');
if (headClose < 0) fail('index.html has no closing </head> tag.');

const legacyMarkers = [
  '<!-- ═══ MASTER UPGRADE PATCH v9.0',
  '<!-- ═══ MASTER PATCH v9.2'
];
const legacyPositions = legacyMarkers.map((marker) => html.indexOf(marker)).filter((index) => index >= 0);
if (legacyPositions.length) {
  // The legacy patches were appended after the original app. Remove that entire
  // appended tail so styles, iframe markup, synthetic data and scripts are removed together.
  const firstLegacyPatch = Math.min(...legacyPositions);
  if (firstLegacyPatch > bodyClose) fail('Legacy patch marker occurs after the closing body tag.');
  html = html.slice(0, firstLegacyPatch) + html.slice(bodyClose);
}

const assetRefs = [
  '/assets/resource-network-core.js',
  '/assets/einsteinminds-resource-network.js',
  '/assets/resource-network.css'
];
for (const ref of assetRefs) {
  const occurrences = html.split(ref).length - 1;
  if (occurrences > 1) fail(`Duplicate asset reference detected: ${ref}`);
}

if (!html.includes(assetRefs[2])) {
  const currentHeadClose = html.toLowerCase().indexOf('</head>');
  html = html.slice(0, currentHeadClose) +
    '\n<link rel="stylesheet" href="/assets/resource-network.css">\n' +
    html.slice(currentHeadClose);
}
if (!html.includes(assetRefs[0]) || !html.includes(assetRefs[1])) {
  const currentBodyClose = html.toLowerCase().lastIndexOf('</body>');
  const scripts = '\n<!-- Einsteinminds Resource Network: live Supabase catalogue; no synthetic provider generation. -->\n' +
    '<script src="/assets/resource-network-core.js"></script>\n' +
    '<script src="/assets/einsteinminds-resource-network.js"></script>\n';
  html = html.slice(0, currentBodyClose) + scripts + html.slice(currentBodyClose);
}

const guardRef = '/assets/auth-route-guard.js';
if (!html.includes(guardRef)) {
  const currentBodyClose = html.toLowerCase().lastIndexOf('</body>');
  html = html.slice(0, currentBodyClose) + `<script src="${guardRef}"></script>\n` + html.slice(currentBodyClose);
}

const forbidden = [
  ['legacy v9.0 marker', 'MASTER UPGRADE PATCH v9.0'],
  ['legacy v9.2 marker', 'MASTER PATCH v9.2'],
  ['in-app browser iframe', 'id="iabFrame"'],
  ['legacy browser overlay', 'id="inAppBrowser"'],
  ['synthetic resource generator', 'VirtualDB']
];
for (const [label, token] of forbidden) {
  if (html.includes(token)) fail(`Legacy content remains after cleanup: ${label}`);
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.copyFileSync(hostingerReadmePath, path.join(root, 'README.md'));

for (const relative of ['netlify.toml', 'Qwen_yaml_20261111_zaqkq6e4u.yaml', 'docs:DEPLOYMENT.md']) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
const malformedWorkflow = path.join(root, '.github', 'workflows', '.github');
if (fs.existsSync(malformedWorkflow)) fs.rmSync(malformedWorkflow, { recursive: true, force: true });

const securityPath = path.join(root, 'SECURITY.md');
if (fs.existsSync(securityPath)) {
  const security = fs.readFileSync(securityPath, 'utf8').replace(
    /\*\*Content Security Policy\*\* and security headers enforced via `netlify\.toml`/g,
    'Security headers are configured in the Hostinger `.htaccess` file; a Content Security Policy has not yet been enabled.'
  );
  fs.writeFileSync(securityPath, security, 'utf8');
}

console.log('Einsteinminds Resource Network update applied.');
console.log('Both appended legacy patches and their iframe/synthetic code were removed.');
console.log('README.md now documents GitHub + Supabase + Hostinger only.');
console.log('Next: run tests and release validation, then inspect the full diff before merging.');
