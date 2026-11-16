const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Ask Einstein resource intent uses real word boundaries', () => {
  const line = html.split('\n').find((value) => value.includes('const wantsResources='));
  assert.ok(line, 'resource intent detection must exist');
  assert.ok(line.includes(String.raw`/\b(find|search|recommend`), 'word-boundary regex must not be double escaped');
  assert.ok(!line.includes(String.raw`/\\b(find|search|recommend`), 'regex must not match literal backslash-b');
});

test('authenticated profile resolution retries Ask Einstein history restoration', () => {
  assert.match(
    html,
    /if\(previousId!==authUser\.id\|\|Agent\.restoredFor!==authUser\.id\)\{await Agent\.restore\(\);if\(Agent\.restoredFor!==authUser\.id\)await Agent\.restore\(\)\}/,
    'restoration must run after auth/profile initialization to close the initial-session race'
  );
});
