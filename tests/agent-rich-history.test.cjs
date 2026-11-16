const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('conversation restoration renders assistant messages through the rich renderer', () => {
  assert.match(html, /this\.history\.forEach\(m=>this\.push\(m\.role==='user'\?esc\(m\.content\):this\.renderAssistant\(m\),m\.role==='user'\)\)/);
  assert.match(html, /renderAssistant\(message\)\{/);
  assert.match(html, /renderMarkdown\(message\.content\)/);
});

test('assistant history preserves resource cards, model and search status', () => {
  assert.match(html, /resources:result\.resources\|\|\[\]/);
  assert.match(html, /resourceSearchUsed:result\.resourceSearchUsed===true/);
  assert.match(html, /resourceSearchStatus:result\.resourceSearchStatus\|\|'not_requested'/);
  assert.match(html, /normalized\.resources=Array\.isArray\(message\.resources\)/);
  assert.match(html, /normalized\.model=String\(message\.model\|\|''\)/);
});

test('restored resource destinations are restricted to safe HTTPS URLs', () => {
  assert.match(html, /if\(url\.protocol!=='https:'\|\|url\.username\|\|url\.password\)return null/);
  assert.match(html, /rel="noopener noreferrer" class="ag-source-link"/);
});

test('assistant Markdown restores safe clickable links and rich formatting', () => {
  assert.match(html, /const safeLink=/);
  assert.match(html, /text=text\.replace\(\/https\?:/);
  assert.ok(html.includes("'<strong>$1</strong>'"));
  assert.match(html, /const bullet=line\.match/);
  assert.match(html, /const heading=line\.match/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /<table style=/);
  assert.match(html, /<blockquote style=/);
});

test('AI backend receives plain role/content history without UI metadata', () => {
  assert.match(html, /this\.history\.slice\(-14\)\.map\(\(\{role,content\}\)=>\(\{role,content\}\)\)/);
});
