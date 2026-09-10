import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  destination,
  startSession,
  canVisit,
  attemptVisit,
  grantAccess,
  requestEscape,
  finishSession,
  restore,
  report,
  reusableSetup,
  checkSetup,
} from '../core/engine.mjs';
const t = 1_000_000;
const config = {
  task: 'Write draft',
  focus: 'docs.google.com',
  minutes: 25,
  level: 'committed',
  resources: ['developer.mozilla.org'],
};
const make = (extra = {}) => startSession({ ...config, ...extra }, t);
test('normalizes domains and preserves the focus URL', () => {
  assert.deepEqual(destination('https://DOCS.google.com/draft?q=1'), {
    url: 'https://docs.google.com/draft?q=1',
    domain: 'docs.google.com',
  });
});
for (const input of [
  '',
  'javascript:alert(1)',
  'ftp://example.com',
  'https://user:pass@example.com',
  'not a site',
  'https://',
])
  test('rejects unsafe or malformed destination: ' + input, () =>
    assert.throws(() => destination(input)),
  );
for (const extra of [
  { task: '' },
  { task: 'x'.repeat(121) },
  { minutes: 0 },
  { minutes: 481 },
  { minutes: 1.5 },
  { minutes: NaN },
  { level: '__proto__' },
  { resources: null },
  { resources: Array(21).fill('example.com') },
])
  test('rejects invalid configuration ' + JSON.stringify(extra), () =>
    assert.throws(() => make(extra)),
  );
test('rejects null configuration', () =>
  assert.throws(() => startSession(null)));
test('allows exact hosts, not subdomains or lookalikes', () => {
  const s = make();
  assert.ok(canVisit(s, 'https://docs.google.com/a', t));
  for (const u of [
    'https://docs.google.com.evil.net',
    'https://evil.net/?docs.google.com',
    'https://sub.docs.google.com',
  ])
    assert.equal(canVisit(s, u, t), false);
});
test('resource deduplication', () =>
  assert.deepEqual(
    make({ resources: ['docs.google.com', 'DOCS.google.com'] }).allowed,
    ['docs.google.com'],
  ));
test('attempts are immutable and record only domain and time', () => {
  const s = make(),
    r = attemptVisit(s, 'https://youtube.com/private?q=secret', t + 1);
  assert.equal(s.attempts.length, 0);
  assert.deepEqual(r.session.attempts, [{ domain: 'youtube.com', at: t + 1 }]);
});
test('allowed navigation does not count as a distraction', () =>
  assert.equal(
    attemptVisit(make(), 'docs.google.com', t).session.attempts.length,
    0,
  ));
test('temporary access expires at exact boundary', () => {
  const s = grantAccess(make(), 'stackoverflow.com', 'Search error', 5, t);
  assert.ok(canVisit(s, 'stackoverflow.com', t + 299999));
  assert.equal(canVisit(s, 'stackoverflow.com', t + 300000), false);
});
test('grants cannot outlive the session', () => {
  const s = grantAccess(
    make({ minutes: 1 }),
    'example.com',
    'Read source',
    5,
    t,
  );
  assert.equal(s.grants[0].until, s.endsAt);
});
test('locked sessions cannot request access', () =>
  assert.throws(
    () =>
      grantAccess(
        make({ level: 'locked' }),
        'example.com',
        'Read source',
        5,
        t,
      ),
    /disabled/,
  ));
test('access validates reason and duration', () => {
  for (const [reason, minutes] of [
    ['', 5],
    ['valid reason', 0],
    ['valid reason', 6],
    ['valid reason', 1.1],
  ])
    assert.throws(() => grantAccess(make(), 'example.com', reason, minutes, t));
});
test('only three access requests are allowed', () => {
  let s = make();
  for (let i = 0; i < 3; i++)
    s = grantAccess(s, 'example.com', 'Read source', 1, t);
  assert.throws(
    () => grantAccess(s, 'example.com', 'Read source', 1, t),
    /three/,
  );
});
for (const [level, delay] of [
  ['light', 0],
  ['committed', 60000],
  ['locked', 900000],
])
  test(level + ' respects precommitted exit delay', () => {
    const s = requestEscape(make({ level }), 'Unexpected meeting', t);
    if (delay)
      assert.throws(() => finishSession(s, 'escaped', t + delay - 1), /wait/);
    assert.equal(finishSession(s, 'escaped', t + delay).status, 'escaped');
    assert.equal(
      requestEscape(s, 'Another reason', t + 5).escape.readyAt,
      t + delay,
    );
  });
test('cannot complete early or escape without requesting', () => {
  assert.throws(() => finishSession(make(), 'completed', t));
  assert.throws(() => finishSession(make(), 'escaped', t));
});
test('recovery always works and is distinguishable', () =>
  assert.equal(
    finishSession(make({ level: 'locked' }), 'recovered', t + 1).status,
    'recovered',
  ));
test('expired session releases websites and cannot grant access', () => {
  const s = make();
  assert.ok(canVisit(s, 'youtube.com', s.endsAt));
  assert.throws(() =>
    grantAccess(s, 'example.com', 'Read source', 5, s.endsAt),
  );
});
test('reload preserves exit wait, expiry and history', () => {
  const s = requestEscape(make(), 'Unexpected meeting', t);
  const r = restore(
    JSON.stringify({ version: 1, session: s, history: [] }),
    t + 20,
  );
  assert.equal(r.session.escape.readyAt, t + 60000);
  assert.equal(r.session.endsAt, s.endsAt);
});
test('reload after expiry completes once and caps elapsed time', () => {
  const s = make();
  const r = restore(
    JSON.stringify({ version: 1, session: s, history: [] }),
    s.endsAt + 999999,
  );
  assert.equal(r.session, null);
  assert.equal(r.history.length, 1);
  assert.equal(report(r.history[0]).seconds, 1500);
  assert.equal(
    restore(JSON.stringify({ version: 1, ...r }), s.endsAt + 1000000).history
      .length,
    1,
  );
});
test('damaged and unknown storage fails visibly', () => {
  for (const raw of [
    '{',
    JSON.stringify({ version: 2, history: [] }),
    JSON.stringify({ version: 1, session: { level: 'locked' }, history: [] }),
  ])
    assert.throws(() => restore(raw));
});
test('report groups actual domains, never manufactures activity', () => {
  let s = make();
  s = attemptVisit(s, 'youtube.com', t + 1).session;
  s = attemptVisit(s, 'youtube.com/watch', t + 2).session;
  const r = report(finishSession(s, 'completed', s.endsAt));
  assert.deepEqual(r.domains, { 'youtube.com': 2 });
  assert.equal(r.attempts, 2);
});
test('nested storage corruption is rejected before rendering', () => {
  const session = make();
  for (const extra of [
    { grants: [null] },
    { attempts: [{}] },
    { escape: {} },
    { focus: 'javascript:bad' },
  ])
    assert.throws(() =>
      restore(
        JSON.stringify({
          version: 1,
          session: { ...session, ...extra },
          history: [],
        }),
        t,
      ),
    );
  assert.throws(() =>
    restore(JSON.stringify({ version: 1, session: null, history: [{}] }), t),
  );
});

// V2 regressions: adding time must never weaken the session's boundaries.
import { extendSession, summarize } from '../core/engine.mjs';
const exam =
  'https://www.mcatofficialprep.org/app/aamc-mcat-practice-exam-3#exams/take_driver/9000';
test('exact exam URL permits its hash route and rejects every other route', () => {
  const s = make({ focus: exam, scope: 'exact', resources: [] });
  assert.ok(canVisit(s, exam, t));
  for (const u of [
    exam.replace('9000', '9001'),
    exam.split('#')[0],
    exam + '?x=1',
    exam.replace('exam-3', 'exam-2'),
    'https://www.mcatofficialprep.org/',
  ])
    assert.equal(canVisit(s, u, t), false);
});
test('exact URLs preserve case, query, fragment and trailing slash distinctions', () => {
  const s = make({
    focus: 'https://example.com/Case?q=a#one',
    scope: 'exact',
    resources: [],
  });
  for (const u of [
    'https://example.com/case?q=a#one',
    'https://example.com/Case?q=b#one',
    'https://example.com/Case/?q=a#one',
  ])
    assert.equal(canVisit(s, u, t), false);
});
test('block mode permits other sites but denies blocked domains and subdomains', () => {
  const s = make({ mode: 'block', blocked: ['youtube.com'] });
  assert.ok(canVisit(s, 'example.com', t));
  assert.ok(canVisit(s, 'notyoutube.com', t));
  assert.equal(canVisit(s, 'music.youtube.com', t), false);
  assert.equal(canVisit(s, 'youtube.com', t), false);
});
test('explicit block wins over resource and cannot receive access', () => {
  const s = make({ resources: ['youtube.com'], blocked: ['youtube.com'] });
  assert.equal(canVisit(s, 'youtube.com', t), false);
  assert.throws(
    () => grantAccess(s, 'youtube.com', 'Review a lecture', 5, t),
    /explicitly blocked/,
  );
});
test('conflicting focus and blocked domain fails setup', () =>
  assert.throws(
    () => make({ focus: 'music.youtube.com', blocked: ['youtube.com'] }),
    /also blocked/,
  ));
test('empty block mode cannot silently allow everything', () =>
  assert.throws(() => make({ mode: 'block', blocked: [] }), /at least one/));
test('extension adds time without changing grants, rules, or the exit wait', () => {
  let s = requestEscape(make(), 'Need to leave', t);
  s = grantAccess(s, 'example.com', 'Read a source', 5, t);
  const extended = extendSession(s, 15, t + 1);
  assert.equal(extended.endsAt, s.endsAt + 900000);
  assert.deepEqual(extended.grants, s.grants);
  assert.deepEqual(extended.escape, s.escape);
  assert.deepEqual(extended.rules, s.rules);
  assert.equal(extended.extensions[0].minutes, 15);
  assert.equal(
    restore(JSON.stringify({ version: 1, session: extended, history: [] }), t)
      .session.endsAt,
    extended.endsAt,
  );
});
test('extension rejects negative, fractional, expired, and over-24-hour requests', () => {
  const s = make();
  for (const n of [0, -5, 1.2, 481])
    assert.throws(() => extendSession(s, n, t));
  assert.throws(() => extendSession(s, 5, s.endsAt));
  let long = make({ minutes: 480 });
  long = extendSession(long, 480, t);
  long = extendSession(long, 480, t);
  assert.throws(() => extendSession(long, 1, t), /24 hours/);
});
test('custom access count and duration are enforced', () => {
  const s = make({
    options: { accessLimit: 1, accessMinutes: 10, exitDelay: 90 },
  });
  const g = grantAccess(s, 'example.com', 'Read a source', 10, t);
  assert.throws(
    () => grantAccess(g, 'other.com', 'Read source', 1, t),
    /access requests/,
  );
  assert.equal(requestEscape(s, 'Need to leave', t).escape.readyAt, t + 90000);
});
test('custom options cannot shorten committed policy or enable Locked access', () => {
  assert.throws(() => make({ options: { exitDelay: 1 } }));
  const s = make({ level: 'locked', options: { accessLimit: 10 } });
  assert.throws(
    () => grantAccess(s, 'example.com', 'Read source', 1, t),
    /disabled/,
  );
});
test('dashboard uses actual outcomes with an honest empty state', () => {
  const empty = summarize([], 7, t);
  assert.equal(empty.completionRate, null);
  assert.equal(empty.seconds, 0);
  const a = finishSession(make(), 'completed', t + 1500000),
    b = finishSession(make(), 'recovered', t + 60000);
  const d = summarize([a, b], 0, t + 1600000);
  assert.equal(d.sessions, 2);
  assert.equal(d.completed, 1);
  assert.equal(d.completionRate, 50);
  assert.equal(d.seconds, 1560);
});

test('reuse preserves original policy but strips grants, attempts, private state and extensions', () => {
  const original = make({
    focus: 'https://example.com/exam#9000',
    scope: 'exact',
    blocked: ['video.example'],
    options: { accessLimit: 2, accessMinutes: 7, exitDelay: 90 },
  });
  const previous = {
    ...original,
    endsAt: original.endsAt + 15 * 60000,
    extensions: [{ minutes: 15, at: t }],
    grants: [{ domain: 'temporary.example', until: t + 1000 }],
    attempts: [{ domain: 'other.example', at: t }],
    private: true,
  };
  const copied = reusableSetup(previous);
  assert.equal(copied.minutes, 25);
  assert.equal(copied.scope, 'exact');
  assert.equal(copied.focus, original.focus);
  assert.deepEqual(copied.options, original.options);
  const next = startSession(copied, t + 100);
  assert.deepEqual(next.grants, []);
  assert.deepEqual(next.attempts, []);
  assert.equal(next.private, false);
  assert.notEqual(next.id, original.id);
  copied.blocked.push('new.example');
  assert.deepEqual(original.blocked, ['video.example']);
});

test('setup checker handles exact fragments and explicit blocks without mutating configuration', () => {
  const c = {
    ...config,
    task: '',
    focus: 'https://example.com/exam#9000',
    scope: 'exact',
    blocked: ['video.example'],
  };
  const before = JSON.stringify(c);
  assert.equal(checkSetup(c, c.focus).allowed, true);
  assert.equal(checkSetup(c, 'https://example.com/exam#9001').allowed, false);
  assert.equal(
    checkSetup({ ...c, mode: 'block' }, 'https://sub.video.example').allowed,
    false,
  );
  assert.equal(
    checkSetup({ ...c, mode: 'block' }, 'https://reference.example').allowed,
    true,
  );
  assert.equal(JSON.stringify(c), before);
  assert.throws(() => checkSetup(c, 'javascript:alert(1)'));
});

test('canonicalizes terminal-dot hostnames for policy matching', () => {
  assert.equal(
    destination('https://DOCS.google.com...').domain,
    'docs.google.com',
  );
  const s = make({ mode: 'block', blocked: ['youtube.com'] });
  assert.equal(canVisit(s, 'https://youtube.com./', t), false);
  assert.equal(canVisit(s, 'https://www.youtube.com./', t), false);
  assert.equal(canVisit(s, 'https://youtube.com.evil/', t), true);
});

test('active policy fails closed for navigation URLs with embedded credentials', () => {
  const s = startSession(
    {
      task: 'Read',
      focus: 'example.com',
      minutes: 10,
      level: 'locked',
      resources: [],
      mode: 'block',
      blocked: ['youtube.com'],
    },
    1000,
  );
  assert.equal(canVisit(s, 'https://user:pass@youtube.com/', 1001), false);
});
