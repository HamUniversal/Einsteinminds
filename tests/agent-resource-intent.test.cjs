const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');

test('Ask Einstein resource intent uses real word boundaries', () => {
  const line = html.split('\n').find((value) => value.includes('const wantsResources='));
  assert.ok(line, 'resource intent detection must exist');
  assert.ok(line.includes('/\\b(find|search|recommend'), 'word-boundary regex must not be double escaped');
  assert.ok(!line.includes('/\\\\b(find|search|recommend'), 'regex must not match literal backslash-b');
});

test('authenticated profile resolution retries Ask Einstein history restoration', () => {
  assert.match(html, /if\(previousId!==authUser\.id\|\|Agent\.restoredFor!==authUser\.id\)\{await Agent\.restore\(\);if\(Agent\.restoredFor!==authUser\.id\)await Agent\.restore\(\)\}/);
});

test('Ask Einstein restores safe clickable links before HTML escaping', () => {
  const start = html.indexOf('renderMarkdown(source){'), end = html.indexOf('renderAssistant(message){', start);
  assert.ok(start >= 0 && end > start);
  const renderer = html.slice(start, end);
  assert.match(renderer, /const safeLink=/);
  assert.ok(renderer.indexOf('text=text.replace(/\[') < renderer.indexOf('text=esc(text)'));
  assert.ok(renderer.includes("out.push('<h'+level+'>'"), 'headings should retain their hierarchy');
  assert.match(renderer, /target="_blank" rel="noopener noreferrer"/);
  assert.match(renderer, /tokenFor\(link\)\+tail/);
});

test('restored assistant messages retain rich Markdown structures', () => {
  const start = html.indexOf('renderMarkdown(source){'), end = html.indexOf('renderAssistant(message){', start);
  const renderer = html.slice(start, end);
  assert.ok(renderer.includes("out.push('<h'+level+'>'"), 'heading hierarchy should be preserved');
  assert.match(renderer, /<table style=/);
  assert.match(renderer, /<blockquote style=/);
  assert.ok(renderer.includes("bullet?'ul':'ol'"));
});
