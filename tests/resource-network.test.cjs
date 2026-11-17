const test = require('node:test');
const assert = require('node:assert/strict');
require('../assets/resource-network-core.js');
const Core = globalThis.EinsteinmindsResourceNetworkCore;

test('learning-level taxonomy spans Pre-K through Entrepreneur and lifelong learning', () => {
  const values = Core.LEARNING_STAGES.map((stage) => stage.value);
  assert.equal(values[0], 'pre_k');
  assert.equal(values.at(-2), 'entrepreneur');
  assert.equal(values.at(-1), 'lifelong');
  assert.equal(values.length, 12);
});

test('all and unspecified are valid filter states; unknown stages are rejected', () => {
  assert.equal(Core.normalizeLearningStage('all'), 'all');
  assert.equal(Core.normalizeLearningStage('unspecified'), 'unspecified');
  assert.equal(Core.normalizeLearningStage('pre_k'), 'pre_k');
  assert.throws(() => Core.normalizeLearningStage('primary-school-ish'), /Unsupported/);
});

test('category slug is validated and optional', () => {
  assert.equal(Core.normalizeCategory('space'), 'space');
  assert.equal(Core.normalizeCategory(''), null);
  assert.throws(() => Core.normalizeCategory('https://evil.example'), /Invalid/);
});

test('search payload bounds page size and preserves learning-level criteria', () => {
  const payload = Core.normalizeSearchPayload({
    query: '  astronomy  ', category: 'space', learning_level: 'doctoral', page: 0, page_size: 500, sort: 'recently_checked'
  });
  assert.equal(payload.query, 'astronomy');
  assert.equal(payload.category, 'space');
  assert.equal(payload.learning_level, 'doctoral');
  assert.equal(payload.page, 1);
  assert.equal(payload.page_size, 48);
  assert.equal(payload.sort, 'recently_checked');
});

test('saved-resource query accepts UUIDs only and caps list size', () => {
  const ids = Array.from({ length: 520 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
  const payload = Core.normalizeSearchPayload({ saved_only: true, resource_ids: ids });
  assert.equal(payload.resource_ids.length, 500);
  assert.throws(() => Core.normalizeSearchPayload({ saved_only: true, resource_ids: ['not-a-uuid'] }), /valid resource IDs/);
});

test('outbound payload accepts a catalogue UUID and never accepts an arbitrary URL', () => {
  const payload = Core.normalizeOutboundPayload('09e91db3-d36e-4437-8796-3c259f1db7a4', 'math');
  assert.deepEqual(Object.keys(payload).sort(), ['add_utm', 'category_slug', 'resource_id']);
  assert.equal(payload.add_utm, true);
  assert.throws(() => Core.normalizeOutboundPayload('https://attacker.example', 'math'), /resource ID/);
});

test('only HTTPS URLs on the stored official host are considered safe', () => {
  assert.equal(Core.isSafeStoredHttps('https://example.org/course', 'example.org'), true);
  assert.equal(Core.isSafeStoredHttps('http://example.org/course', 'example.org'), false);
  assert.equal(Core.isSafeStoredHttps('https://evil.example/course', 'example.org'), false);
  assert.equal(Core.isSafeStoredHttps('https://user:pass@example.org/', 'example.org'), false);
  assert.equal(Core.isSafeStoredHttps('https://example.org:8443/', 'example.org'), false);
});

test('HTML escaping prevents provider metadata from becoming markup', () => {
  assert.equal(Core.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('unclassified resources are not assigned a learning level by default', () => {
  assert.equal(Core.stageLabel([]), 'Learning level not yet classified');
  assert.equal(Core.stageLabel(null), 'Learning level not yet classified');
  assert.equal(Core.editorialLabel({ editorial_status: 'candidate' }), 'Directory listing · not independently reviewed');
});


test('homepage recommendation refresh is wired to a fresh backend request', () => {
  const fs = require('node:fs');
  const frontend = fs.readFileSync(require.resolve('../assets/einsteinminds-resource-network.js'), 'utf8');
  const app = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const edge = fs.readFileSync(require.resolve('../supabase/functions/resource-search/index.ts'), 'utf8');
  assert.match(frontend, /async function refreshHomeRecommendations\(force = false\)/);
  assert.match(frontend, /action: 'recommendations'/);
  assert.match(frontend, /refreshHomeRecommendations\s*$/m);
  assert.match(app, /async refreshRec\(\)[\s\S]{0,500}refreshHomeRecommendations/);
  assert.match(edge, /body\?\.action===["']recommendations["']/);
  assert.match(edge, /private, no-store/);
});
