import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildRules } from '../extension/rules.mjs';
import { startSession, grantAccess } from '../core/engine.mjs';
const config = {
  task: 'Write draft',
  focus: 'docs.google.com',
  minutes: 25,
  level: 'committed',
  resources: [],
};
let state, rules, listener, _alarmListener, changes, memory, sessionRules;
const event = () => ({ addListener() {} });
globalThis.chrome = {
  webNavigation: {
    onCommitted: event(),
    onHistoryStateUpdated: event(),
    onReferenceFragmentUpdated: event(),
  },
  runtime: {
    id: 'test-extension',
    getURL: (p) => 'chrome-extension://test-extension/' + p,
    onMessage: { addListener: (fn) => (listener = fn) },
    onStartup: event(),
    onInstalled: event(),
  },
  extension: {
    inIncognitoContext: false,
    isAllowedIncognitoAccess: async () => true,
  },
  storage: {
    session: {
      get: async () => structuredClone(memory),
      set: async (data) => {
        memory = structuredClone(data);
      },
      remove: async () => {
        memory = {};
      },
    },
    local: {
      get: async () => structuredClone(state),
      set: async (data) => {
        state = structuredClone(data);
      },
    },
  },
  declarativeNetRequest: {
    getSessionRules: async () => sessionRules,
    updateSessionRules: async ({ addRules }) => {
      sessionRules = addRules;
    },
    getDynamicRules: async () => rules,
    updateDynamicRules: async ({ addRules }) => {
      rules = addRules;
    },
  },
  alarms: {
    clear: async () => {},
    create: async () => {},
    onAlarm: { addListener: (fn) => (_alarmListener = fn) },
  },
  action: { setBadgeText: async () => {} },
  tabs: {
    query: async () => [],
    update: async (id, change) => changes.push({ id, change }),
    onUpdated: event(),
    onActivated: event(),
  },
};
await import('../extension/background.mjs');
const sender = {
  id: 'test-extension',
  url: 'chrome-extension://test-extension/index.html',
};
const send = (type, payload = {}, source = sender) =>
  new Promise((resolve) => listener({ type, payload }, source, resolve));
beforeEach(() => {
  state = { session: null, history: [] };
  rules = [];
  changes = [];
  memory = {};
  sessionRules = [];
});
test('start → DNR policy → attempt → temporary access → recovery removes rules', async () => {
  assert.ok((await send('start', config)).data.session);
  assert.equal(rules[0].action.type, 'redirect');
  await send('attempt', { url: 'https://youtube.com/watch?v=private' });
  assert.equal(state.session.attempts[0].domain, 'youtube.com');
  await send('access', {
    url: 'stackoverflow.com',
    reason: 'Search an error',
    minutes: 5,
  });
  assert.ok(
    rules.some((r) => r.condition.regexFilter.includes('stackoverflow')),
  );
  await send('finish', { kind: 'recovered' });
  assert.equal(rules.length, 0);
  assert.equal(state.history[0].status, 'recovered');
});
test('rejects control messages from web pages and foreign extensions', async () => {
  for (const source of [
    { id: 'test-extension', url: 'https://example.com' },
    { id: 'other', url: 'chrome-extension://test-extension/index.html' },
  ])
    assert.match(
      (await send('start', config, source)).error,
      /extension pages/,
    );
  assert.equal(state.session, null);
});
test('serialized double start creates only one session', async () => {
  const results = await Promise.all([
    send('start', config),
    send('start', config),
  ]);
  assert.equal(results.filter((x) => x.error).length, 1);
});
test('worker cannot bypass committed escape policy', async () => {
  await send('start', config);
  assert.match((await send('finish', { kind: 'escaped' })).error, /wait/);
  await send('escape', { reason: 'Need to leave' });
  assert.match((await send('finish', { kind: 'escaped' })).error, /wait/);
  assert.ok(state.session);
});
test('locked worker rejects temporary access', async () => {
  await send('start', { ...config, level: 'locked' });
  assert.match(
    (
      await send('access', {
        url: 'example.com',
        reason: 'Read source',
        minutes: 5,
      })
    ).error,
    /disabled/,
  );
});
test('get after expiry archives once and releases persistent rules', async () => {
  await send('start', config);
  state.session.endsAt = Date.now() - 1;
  await send('get');
  assert.equal(state.session, null);
  assert.equal(rules.length, 0);
  await send('get');
  assert.equal(state.history.length, 1);
});
test('rules use exact hostname boundaries and escape metacharacters', () => {
  const s = startSession(config, 100);
  const allow = buildRules(s, 'chrome-extension://id/', 101)[1];
  const regex = new RegExp(allow.condition.regexFilter);
  assert.ok(regex.test('https://docs.google.com/'));
  assert.ok(regex.test('http://docs.google.com:8080/'));
  for (const u of [
    'https://docs.google.com.evil/',
    'https://docsXgoogle.com/',
    'https://sub.docs.google.com/',
    'https://evil.com/?docs.google.com/',
  ])
    assert.equal(regex.test(u), false);
});
test('grant expiry removes allow rules; session expiry removes every rule', () => {
  const s = grantAccess(
    startSession(config, 100),
    'example.com',
    'Read source',
    1,
    100,
  );
  assert.equal(buildRules(s, 'chrome-extension://id/', 101).length, 3);
  assert.equal(buildRules(s, 'chrome-extension://id/', 60100).length, 2);
  assert.equal(buildRules(s, 'chrome-extension://id/', s.endsAt).length, 0);
});
test('extension command persists added time and keeps its rules', async () => {
  await send('start', config);
  const deadline = state.session.endsAt;
  const before = structuredClone(rules);
  await send('extend', { minutes: 15 });
  assert.equal(state.session.endsAt, deadline + 900000);
  assert.deepEqual(rules, before);
});
test('private session stays out of persistent state, dynamic rules, and history', async () => {
  await send('start', { ...config, private: true });
  assert.equal(state.session, null);
  assert.ok(memory.privateSession.private);
  assert.equal(rules.length, 0);
  assert.ok(sessionRules.length);
  await send(
    'attempt',
    { url: 'youtube.com' },
    { ...sender, tab: { incognito: true } },
  );
  assert.equal(memory.privateSession.attempts.length, 0);
  await send('finish', { kind: 'recovered' });
  assert.equal(state.history.length, 0);
  assert.equal(sessionRules.length, 0);
  assert.deepEqual(memory, {});
});
test('private attempts do not enter a regular session report', async () => {
  await send('start', config);
  await send(
    'attempt',
    { url: 'youtube.com' },
    { ...sender, tab: { incognito: true } },
  );
  assert.equal(state.session.attempts.length, 0);
});
test('private-window permission is reported without claiming it can be enabled', async () => {
  assert.equal((await send('get')).data.incognitoAllowed, true);
});
test('exact URL DNR permits only the network URL; fragment checks remain in navigation policy', () => {
  const s = startSession(
    {
      ...config,
      scope: 'exact',
      focus: 'https://example.com/exam?q=1#driver/9000',
    },
    100,
  );
  const r = buildRules(s, 'chrome-extension://id/', 101).find(
    (r) => r.action.type === 'allow',
  );
  const re = new RegExp(r.condition.regexFilter);
  assert.ok(re.test('https://example.com/exam?q=1'));
  assert.equal(re.test('https://example.com/exam?q=2'), false);
  assert.equal(r.condition.isUrlFilterCaseSensitive, true);
});
