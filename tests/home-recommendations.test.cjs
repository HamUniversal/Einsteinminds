const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
const index = read('index.html');
const network = read('assets/einsteinminds-resource-network.js');
const search = read('supabase/functions/resource-search/index.ts');

test('home suggestions use the first explicit learning goal category when one maps to the directory', () => {
  assert.match(network, /function recommendationPayload\(\)/);
  assert.match(network, /S\.goals\[0\]\?\.s/);
  assert.match(network, /CATS\.find/);
  assert.match(network, /payload\.category = category\.id/);
  assert.match(search, /requestedCategory/);
  assert.match(search, /resource_category_links\.category_id/);
});

test('saved directory resources are excluded from home suggestions when alternatives exist', () => {
  assert.match(network, /exclude_ids: getSavedIds\(\)\.slice\(0, 100\)/);
  assert.match(search, /body\.exclude_ids/);
  assert.match(search, /excludedIds\.includes\(item\.id\)/);
  assert.doesNotMatch(search, /random_catalogue_sample/);
});

test('home loads recommendations automatically and the Refresh action forces a new server request', () => {
  assert.match(index, /refreshHomeRecommendations\(false\)/);
  assert.match(index, /refreshHomeRecommendations\(true\)/);
  assert.match(network, /callFunction\('resource-search', payload\)/);
});

test('home recommendations disclose the available matching basis and do not imply independent verification', () => {
  assert.match(index, /Home suggestions use its matching directory category and exclude your saved resources/);
  assert.match(index, /directory listings are not quality or age-suitability endorsements/);
});
