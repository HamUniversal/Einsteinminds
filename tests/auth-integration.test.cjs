const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

test('Supabase bootstrap does not query private profiles before restoring a session', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  assert.ok(authStart >= 0 && authEnd > authStart, 'Auth object is present');
  const authSource = html.slice(authStart, authEnd);
  const initStart = authSource.indexOf('async init(){');
  const initEnd = authSource.indexOf('get signedIn()', initStart);
  const initSource = authSource.slice(initStart, initEnd);
  assert.match(initSource, /auth\.getSession\(\)/);
  assert.doesNotMatch(initSource, /from\(['"]profiles['"]\)/);
  assert.ok(initSource.indexOf('auth.getSession()') > initSource.indexOf('onAuthStateChange'));
});

test('registration creates a profile through the authenticated client after sign-up', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  const authSource = html.slice(authStart, authEnd);
  assert.match(authSource, /auth\.signUp\(/);
  assert.match(authSource, /from\('profiles'\)\s*\.insert\(\{id:authUser\.id,display_name:displayName\}\)/);
  assert.match(authSource, /auth\.signInWithPassword\(/);
  assert.match(authSource, /auth\.signOut\(/);
  assert.match(authSource, /auth\.onAuthStateChange\(/);
});

test('user-facing account role is not taken from editable user metadata', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  const authSource = html.slice(authStart, authEnd);
  assert.match(authSource, /role:'Adult test account'/);
  assert.doesNotMatch(authSource, /role:authUser\.user_metadata/);
});

test('route guard loads before the deferred Auth.init callback can run', () => {
  assert.match(html, /window\.addEventListener\('load',\(\)=>Auth\.init\(\),\{once:true\}\)/);
  assert.match(html, /<script src="\/assets\/auth-route-guard\.js"><\/script>/);
  assert.doesNotMatch(html, /(?<!addEventListener\('load',\(\)=>)Auth\.init\(\);/);
});
