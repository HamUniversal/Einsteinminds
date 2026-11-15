const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..');

test('updater removes both appended legacy patches and iframe, installs assets, and replaces README', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'einsteinminds-update-'));
  try {
    for (const relative of ['assets/resource-network-core.js', 'assets/einsteinminds-resource-network.js', 'assets/resource-network.css', 'scripts/apply-update.mjs', 'scripts/validate-release.mjs', 'README-HOSTINGER.md', '.htaccess', '.github/workflows/validate.yml']) {
      const target = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(packageRoot, relative), target);
    }
    const original = '<!doctype html><html><head></head><body><main>original app</main></body></html>';
    const patch9 = '<!-- ═══ MASTER UPGRADE PATCH v9.0 --><style>.legacy{}</style><div id="inAppBrowser"><iframe id="iabFrame"></iframe></div><script>const VirtualDB = {};</script>';
    const patch92 = '<!-- ═══ MASTER PATCH v9.2 --><style>.legacy2{}</style><div id="inAppBrowser"><iframe id="iabFrame"></iframe></div><script>const fakeCount = 2400000;</script>';
    fs.writeFileSync(path.join(fixture, 'index.html'), original.replace('</body>', patch9 + patch92 + '</body>'));
    fs.writeFileSync(path.join(fixture, 'README.md'), '# old readme');
    fs.writeFileSync(path.join(fixture, 'netlify.toml'), 'old');
    fs.writeFileSync(path.join(fixture, 'Qwen_yaml_20261111_zaqkq6e4u.yaml'), 'old');
    fs.writeFileSync(path.join(fixture, 'docs:DEPLOYMENT.md'), 'old');
    fs.mkdirSync(path.join(fixture, '.github/workflows/.github'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'SECURITY.md'), '- **Content Security Policy** and security headers enforced via `netlify.toml`');

    execFileSync(process.execPath, [path.join(fixture, 'scripts/apply-update.mjs')], { cwd: fixture, stdio: 'pipe' });

    const html = fs.readFileSync(path.join(fixture, 'index.html'), 'utf8');
    assert.match(html, /\/assets\/resource-network-core\.js/);
    assert.match(html, /\/assets\/einsteinminds-resource-network\.js/);
    assert.match(html, /\/assets\/resource-network\.css/);
    assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|MASTER PATCH v9\.2|iabFrame|inAppBrowser|VirtualDB|fakeCount/);
    assert.equal((html.match(/\/assets\/resource-network-core\.js/g) || []).length, 1);
    assert.equal((html.match(/\/assets\/einsteinminds-resource-network\.js/g) || []).length, 1);
    assert.equal((html.match(/\/assets\/resource-network\.css/g) || []).length, 1);
    assert.match(fs.readFileSync(path.join(fixture, 'README.md'), 'utf8'), /GitHub \+ Supabase \+ Hostinger/);
    execFileSync(process.execPath, [path.join(fixture, 'scripts/validate-release.mjs')], { cwd: fixture, stdio: 'pipe' });
    for (const relative of ['netlify.toml', 'Qwen_yaml_20261111_zaqkq6e4u.yaml', 'docs:DEPLOYMENT.md', '.github/workflows/.github']) {
      assert.equal(fs.existsSync(path.join(fixture, relative)), false, `${relative} should be removed`);
    }
    assert.match(fs.readFileSync(path.join(fixture, 'SECURITY.md'), 'utf8'), /Hostinger/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
