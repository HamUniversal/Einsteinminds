#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const assetsDir = path.join(root, 'assets');
const corePath = path.join(assetsDir, 'resource-network-core.js');
const appPath = path.join(assetsDir, 'einsteinminds-resource-network.js');
const cssPath = path.join(assetsDir, 'resource-network.css');
const hostingerReadmePath = path.join(root, 'README-HOSTINGER.md');

function fail(message) {
  console.error(`Update not applied: ${message}`);
  process.exit(1);
}

for (const required of [indexPath, corePath, appPath, cssPath, hostingerReadmePath]) {
  if (!fs.existsSync(required)) fail(`Required file not found: ${path.relative(root, required)}`);
}

let html = fs.readFileSync(indexPath, 'utf8');
const legacyMarker = '<!-- ═══ MASTER UPGRADE PATCH v9.0';
const bodyEnd = html.toLowerCase().lastIndexOf('</body>');
if (bodyEnd < 0) fail('index.html has no closing </body> tag.');

const replacement = `\n<!-- Einsteinminds Resource Network: Supabase-backed catalogue; no synthetic provider generation. -->\n<script src="/assets/resource-network-core.js"></script>\n<script src="/assets/einsteinminds-resource-network.js"></script>\n`;
const legacyStart = html.indexOf(legacyMarker);
if (legacyStart >= 0) {
  html = html.slice(0, legacyStart) + replacement + html.slice(bodyEnd);
} else if (!html.includes('/assets/einsteinminds-resource-network.js')) {
  const currentBodyEnd = html.toLowerCase().lastIndexOf('</body>');
  html = html.slice(0, currentBodyEnd) + replacement + html.slice(currentBodyEnd);
} else {
  console.log('Resource Network script is already referenced; legacy block not found.');
}

if (!html.includes('/assets/resource-network.css')) {
  const headEnd = html.toLowerCase().indexOf('</head>');
  if (headEnd < 0) fail('index.html has no closing </head> tag.');
  html = html.slice(0, headEnd) + '\n<link rel="stylesheet" href="/assets/resource-network.css">\n' + html.slice(headEnd);
}

fs.writeFileSync(indexPath, html, 'utf8');

// Replace the legacy Netlify-oriented project README with the correct stack guide.
fs.copyFileSync(hostingerReadmePath, path.join(root, 'README.md'));

// Remove obsolete Netlify configuration and malformed legacy workflow locations.
for (const relative of ['netlify.toml', 'Qwen_yaml_20261111_zaqkq6e4u.yaml', 'docs:DEPLOYMENT.md']) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
const malformedWorkflow = path.join(root, '.github', 'workflows', '.github');
if (fs.existsSync(malformedWorkflow)) fs.rmSync(malformedWorkflow, { recursive: true, force: true });

// Replace false deployment/security references without rewriting unrelated policy text.
const securityPath = path.join(root, 'SECURITY.md');
if (fs.existsSync(securityPath)) {
  const security = fs.readFileSync(securityPath, 'utf8').replace(/\*\*Content Security Policy\*\* and security headers enforced via `netlify\.toml`/g, 'Security headers are configured in the Hostinger `.htaccess` file; a Content Security Policy has not yet been enabled.');
  fs.writeFileSync(securityPath, security, 'utf8');
}

console.log('Einsteinminds Resource Network update applied.');
console.log('README.md now documents GitHub + Supabase + Hostinger only.');
console.log('Next: run `node scripts/validate-release.mjs` and inspect the diff before committing to GitHub.');
