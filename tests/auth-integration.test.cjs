const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  assert.match(authSource, /role:'Adult account',plan:billing\?'pro':'free',ageBand:'adult'/);
  assert.doesNotMatch(authSource, /role\s*:\s*(?:authUser|profile)\.user_metadata/);
});

test('route guard loads before the deferred Auth.init callback can run', () => {
  assert.match(html, /window\.addEventListener\('load',\(\)=>Auth\.init\(\),\{once:true\}\)/);
  assert.match(html, /<script src="\/assets\/auth-route-guard\.js"><\/script>/);
  assert.doesNotMatch(html, /(?<!addEventListener\('load',\(\)=>)Auth\.init\(\);/);
});

test('production registration requires adult account-holder confirmation and verified email', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  const authSource = html.slice(authStart, authEnd);
  assert.match(authSource, /id="adultConfirm"/);
  assert.match(authSource, /if\(!\$\('#adultConfirm'\)\?\.checked\)/);
  assert.match(authSource, /emailRedirectTo:window\.location\.origin\+'\/'/);
  assert.match(authSource, /auth\.signUp\(/);
  assert.match(authSource, /Check your email and confirm your address/);
  assert.match(authSource, /role:'Adult account',plan:billing\?'pro':'free',ageBand:'adult'/);
});

test('account recovery supports password reset and update', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  const authSource = html.slice(authStart, authEnd);
  assert.match(authSource, /auth\.resetPasswordForEmail\(/);
  assert.match(authSource, /auth\.updateUser\(\{password\}\)/);
  assert.match(authSource, /event==='PASSWORD_RECOVERY'/);
});

test('sign out clears the local Supabase session and app user state', () => {
  const authStart = html.indexOf('const Auth={');
  const authEnd = html.indexOf('const Usage=', authStart);
  const authSource = html.slice(authStart, authEnd);
  assert.match(authSource, /auth\.signOut\(\{scope:'local'\}\)/);
  assert.match(authSource, /Agent\.onAuthSession\(null\)/);
});

test('all inline application scripts parse before release', () => {
  const inlineScripts = [...html.matchAll(new RegExp('<script\\b(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</script>', 'gi'))];
  assert.ok(inlineScripts.length > 0, 'at least one inline application script is present');
  for (const [index, match] of inlineScripts.entries()) {
    assert.doesNotThrow(
      () => new vm.Script(match[1], { filename: `index.html:inline-script-${index + 1}` }),
      `inline script ${index + 1} must parse without syntax errors`
    );
  }
});
