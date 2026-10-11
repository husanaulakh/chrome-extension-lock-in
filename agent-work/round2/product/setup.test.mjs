import test from 'node:test';
import assert from 'node:assert/strict';
import {
  affectedTabs,
  exportStorage,
  normalizeSetup,
  readSetups,
  saveSetup,
} from './setup.mjs';

const config = {
  task: 'Study',
  focus: 'https://example.test/exam#one',
  scope: 'exact',
  mode: 'allow',
  resources: [],
  blocked: [],
  minutes: 25,
  level: 'committed',
  options: { accessLimit: 3, accessMinutes: 5, exitDelay: 60 },
};

function storage(value) {
  let current = value;
  return {
    async get(key) {
      if (key === null) return current;
      return { [key]: current[key] };
    },
    async set(next) {
      current = { ...current, ...next };
    },
    value: () => current,
  };
}

test('normalizes setup bounds and rejects missing required fields', () => {
  const safe = normalizeSetup({
    ...config,
    task: ' x '.repeat(100),
  });
  assert.equal(safe, null);
  assert.equal(normalizeSetup({ ...config, minutes: 999 }), null);
  assert.equal(normalizeSetup({ task: 'Missing focus' }), null);
});

test('damaged setup storage is reported and valid entries remain bounded', async () => {
  const damaged = storage({ savedSetups: [{ nope: true }, config] });
  const result = await readSetups(damaged);
  assert.equal(result.damaged, true);
  assert.equal(result.setups.length, 1);

  const list = await saveSetup(damaged, 'Exam', config, result.setups);
  assert.equal(list[0].name, 'Exam');
  assert.equal(list.length, 2);
});

test('preflight excludes private tabs and returns capped plain text labels', () => {
  const tabs = [
    { id: 1, incognito: true, url: 'https://private.test/?secret=1' },
    { id: 2, incognito: false, url: 'https://example.test/exam#two' },
    { id: 3, incognito: false, url: 'chrome://settings' },
  ];
  const result = affectedTabs(tabs, config, (_setup, url) => ({
    allowed: url.endsWith('#one'),
  }));
  assert.deepEqual(result, [{ id: 2, label: 'Open tab on example.test' }]);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('storage export reports read failures without creating a file', async () => {
  const result = await exportStorage({
    async get() {
      throw Error('unavailable');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.json, undefined);
});
