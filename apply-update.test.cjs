const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..');

test('apply-update replaces legacy patch, inserts assets, and replaces Netlify README', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'einsteinminds-update-'));
  try {
    for (const relative of ['assets/resource-network-core.js', 'assets/einsteinminds-resource-network.js', 'assets/resource-network.css', 'scripts/apply-update.mjs', 'scripts/validate-release.mjs', 'README-HOSTINGER.md', '.htaccess', '.github/workflows/validate.yml']) {
      const target = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(packageRoot, relative), target);
    }
    fs.writeFileSync(path.join(fixture, 'index.html'), '<!doctype html><html><head></head><body><main>app</main>\n<!-- ═══ MASTER UPGRADE PATCH v9.0 old --><div id="iabFrame"></div><script>oldFakePatch()</script>\n<!-- end old patch --></body></html>');
    fs.writeFileSync(path.join(fixture, 'README.md'), '# Netlify old readme');
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
    assert.doesNotMatch(html, /MASTER UPGRADE PATCH v9\.0|iabFrame|oldFakePatch/);
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
