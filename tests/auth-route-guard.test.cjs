const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const guardSource = fs.readFileSync(path.resolve(__dirname, '../assets/auth-route-guard.js'), 'utf8');

function createHarness() {
  const calls = { routes: [], gate: [], authOpen: [], toast: [], renders: 0, init: 0 };
  const context = {
    Auth: {
      backendReady: true,
      signedIn: false,
      async init() { calls.init++; },
      open(tab) { calls.authOpen.push(tab); }
    },
    Nav: {
      go(route) { calls.routes.push(route); },
      render() { calls.renders++; }
    },
    Gate: {
      require(action) { calls.gate.push(action); return true; }
    },
    Toast: { show(message, kind) { calls.toast.push({ message, kind }); } },
    console: { error() {} }
  };
  vm.runInNewContext(guardSource, context, { filename: 'auth-route-guard.js' });
  return { ...context, calls };
}

test('private routes are blocked until Supabase session initialization completes', async () => {
  const h = createHarness();
  assert.equal(h.Auth.ready, false);
  h.Nav.go('wellbeing');
  assert.deepEqual(h.calls.routes, []);
  assert.equal(h.calls.toast.at(-1).kind, 'warn');

  await h.Auth.init();
  assert.equal(h.Auth.ready, true);
  assert.equal(h.calls.renders, 1);

  h.Nav.go('wellbeing');
  assert.deepEqual(h.calls.authOpen, ['in']);
  assert.deepEqual(h.calls.routes, []);

  h.Auth.backendReady = true;
  h.Auth.signedIn = true;
  h.Nav.go('wellbeing');
  assert.deepEqual(h.calls.routes, ['wellbeing']);
});

test('public routes remain available without a signed-in session', () => {
  const h = createHarness();
  h.Auth.ready = true;
  h.Nav.go('home');
  assert.deepEqual(h.calls.routes, ['home']);
  assert.deepEqual(h.calls.authOpen, []);
});

test('Gate.require refuses gated actions while auth is initializing', () => {
  const h = createHarness();
  assert.equal(h.Gate.require('save'), false);
  assert.deepEqual(h.calls.gate, []);
  h.Auth.ready = true;
  assert.equal(h.Gate.require('save'), true);
  assert.deepEqual(h.calls.gate, ['save']);
});

test('all account-only navigation routes are protected', () => {
  const expected = [
    'agent', 'mylearning', 'portfolio', 'assessments', 'wellbeing',
    'screentime', 'educator', 'parent', 'institutions', 'settings'
  ];
  for (const route of expected) {
    assert.match(guardSource, new RegExp("'" + route + "'"));
  }
  for (const route of ['home', 'explore', 'resources']) {
    assert.doesNotMatch(guardSource, new RegExp("'" + route + "'"));
  }
});
