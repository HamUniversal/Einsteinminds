const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');

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

test('Ask Einstein restores clickable Markdown and bare URLs before HTML escaping', () => {
  const rendererStart = html.indexOf('renderMarkdown(source){');
  const rendererEnd = html.indexOf('renderAssistant(message){', rendererStart);
  assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, 'message renderer must exist');
  const renderer = html.slice(rendererStart, rendererEnd);
  assert.match(renderer, /const safeLink=/, 'restoration must validate and rebuild safe links');
  assert.ok(renderer.indexOf('text=text.replace(/\\\\[') < renderer.indexOf('text=esc(text)'), 'links must be tokenized before escaping');
  assert.match(renderer, /target="_blank" rel="noopener noreferrer"/, 'restored links must remain clickable and safe');
  assert.match(renderer, /https\?:\\\\\/\\\\\//, 'bare URLs must be linkified after refresh');
});

test('Ask Einstein restored messages retain rich Markdown structures', () => {
  const rendererStart = html.indexOf('renderMarkdown(source){');
  const rendererEnd = html.indexOf('renderAssistant(message){', rendererStart);
  const renderer = html.slice(rendererStart, rendererEnd);
  assert.match(renderer, /<h'+level>/, 'headings should retain their hierarchy');
  assert.match(renderer, /<table style=/, 'Markdown tables should remain tables after restore');
  assert.match(renderer, /<blockquote style=/, 'block quotes should remain formatted after restore');
  assert.match(renderer, /<ol>/, 'numbered lists should remain numbered');
});
