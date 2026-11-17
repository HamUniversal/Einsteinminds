const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..');

test('Hostinger updater removes appended legacy patches and installs required static assets', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'einsteinminds-hostinger-'));
  try {
    for (const relative of [
      'assets/resource-network-core.js',
      'assets/einsteinminds-resource-network.js',
      'assets/resource-network.css',
      'assets/auth-route-guard.js',
      'scripts/apply-update.mjs',
      'README-HOSTINGER.md'
    ]) {
      const target = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(packageRoot, relative), target);
    }
    const original = fs.readFileSync(path.join(packageRoot, 'index.html'), 'utf8');
    const patch9 = '<!-- ═══ MASTER UPGRADE PATCH v9.0 --><style>.legacy{}</style><div id="inAppBrowser"><iframe id="iabFrame"></iframe></div><script>const VirtualDB = {};</script>';
    const patch92 = '<!-- ═══ MASTER PATCH v9.2 --><style>.legacy2{}</style><div id="inAppBrowser"><iframe id="iabFrame"></iframe></div><script>const fakeCount = 2400000;</script>';
    fs.writeFileSync(path.join(fixture, 'index.html'), original.replace('</body>', patch9 + patch92 + '</body>'));
    fs.writeFileSync(path.join(fixture, 'README.md'), '# canonical repository readme');
    fs.writeFileSync(path.join(fixture, 'Qwen_yaml_20261111_zaqkq6e4u.yaml'), 'stale');
    fs.mkdirSync(path.join(fixture, '.github/workflows/.github'), { recursive: true });

    execFileSync(process.execPath, [path.join(fixture, 'scripts/apply-update.mjs')], { cwd: fixture, stdio: 'pipe' });

    const html = fs.readFileSync(path.join(fixture, 'index.html'), 'utf8');
    for (const ref of [
      '/assets/resource-network-core.js',
      '/assets/einsteinminds-resource-network.js',
      '/assets/resource-network.css',
      '/assets/auth-route-guard.js'
    ]) assert.equal((html.match(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1);
    assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|iabFrame|inAppBrowser|VirtualDB|fakeCount/);
    assert.equal(fs.readFileSync(path.join(fixture, 'README.md'), 'utf8'), '# canonical repository readme');
    assert.equal(fs.existsSync(path.join(fixture, 'Qwen_yaml_20261111_zaqkq6e4u.yaml')), false);
    assert.equal(fs.existsSync(path.join(fixture, '.github/workflows/.github')), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
