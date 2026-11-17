#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const assetsDir = path.join(root, 'assets');
const requiredAssets = [
  'resource-network-core.js',
  'einsteinminds-resource-network.js',
  'resource-network.css',
  'auth-route-guard.js'
];
const hostingerReadmePath = path.join(root, 'README-HOSTINGER.md');

function fail(message) {
  console.error(`Update not applied: ${message}`);
  process.exit(1);
}

for (const required of [indexPath, hostingerReadmePath, ...requiredAssets.map((name) => path.join(assetsDir, name))]) {
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
  const firstLegacyPatch = Math.min(...legacyPositions);
  if (firstLegacyPatch > bodyClose) fail('Legacy patch marker occurs after the closing body tag.');
  html = html.slice(0, firstLegacyPatch) + html.slice(bodyClose);
}

const refs = {
  core: '/assets/resource-network-core.js',
  app: '/assets/einsteinminds-resource-network.js',
  css: '/assets/resource-network.css',
  guard: '/assets/auth-route-guard.js'
};
for (const ref of Object.values(refs)) {
  const occurrences = html.split(ref).length - 1;
  if (occurrences > 1) fail(`Duplicate asset reference detected: ${ref}`);
}
if (!html.includes(refs.css)) {
  const position = html.toLowerCase().indexOf('</head>');
  html = html.slice(0, position) + '\n<link rel="stylesheet" href="' + refs.css + '">\n' + html.slice(position);
}
if (!html.includes(refs.core) || !html.includes(refs.app)) {
  const position = html.toLowerCase().lastIndexOf('</body>');
  html = html.slice(0, position) + '\n<script src="' + refs.core + '"></script>\n<script src="' + refs.app + '"></script>\n' + html.slice(position);
}
if (!html.includes(refs.guard)) {
  const position = html.toLowerCase().lastIndexOf('</body>');
  html = html.slice(0, position) + '<script src="' + refs.guard + '"></script>\n' + html.slice(position);
}

const forbidden = [
  'MASTER UPGRADE PATCH v9.0',
  'MASTER PATCH v9.2',
  'id="iabFrame"',
  'id="inAppBrowser"',
  'VirtualDB'
];
for (const token of forbidden) if (html.includes(token)) fail(`Legacy content remains: ${token}`);

fs.writeFileSync(indexPath, html, 'utf8');
for (const relative of ['Qwen_yaml_20261111_zaqkq6e4u.yaml', 'docs:DEPLOYMENT.md']) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
const malformedWorkflow = path.join(root, '.github', 'workflows', '.github');
if (fs.existsSync(malformedWorkflow)) fs.rmSync(malformedWorkflow, { recursive: true, force: true });

console.log('Einstein Minds Hostinger update applied.');
console.log('Legacy appended patches and synthetic resource code were removed.');
console.log('README.md was left unchanged; Hostinger instructions are in README-HOSTINGER.md.');
