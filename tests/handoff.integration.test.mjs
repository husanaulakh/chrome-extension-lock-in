import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const config = {
  task: "Write draft",
  focus: "docs.google.com",
  minutes: 25,
  level: "committed",
  resources: [],
};
let state, listener, beforeNavigate, memory, dynamicRules, sessionRules;
const event = () => ({ addListener() {} });
globalThis.chrome = {
  webNavigation: {
    onBeforeNavigate: { addListener: (fn) => (beforeNavigate = fn) },
    onCommitted: event(),
    onHistoryStateUpdated: event(),
    onReferenceFragmentUpdated: event(),
  },
  runtime: {
    id: "test-extension",
    getURL: (path) => "chrome-extension://test-extension/" + path,
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
        memory = { ...memory, ...structuredClone(data) };
      },
      remove: async (keys) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) delete memory[key];
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
    getDynamicRules: async () => dynamicRules,
    updateDynamicRules: async ({ addRules }) => {
      dynamicRules = addRules;
    },
  },
  alarms: { clear: async () => {}, create: async () => {}, onAlarm: { addListener() {} } },
  action: { setBadgeText: async () => {} },
  tabs: { query: async () => [], update: async () => {}, onUpdated: event(), onActivated: event() },
};
await import("../extension/background.mjs");
const sender = { id: "test-extension", url: "chrome-extension://test-extension/index.html" };
const send = (type, payload = {}, source = sender) =>
  new Promise((resolve) => listener({ type, payload }, source, resolve));
beforeEach(() => {
  state = { session: null, history: [] };
  memory = {};
  dynamicRules = [];
  sessionRules = [];
});

test("generic redirect recovers exact per-tab destination after reload and worker restart", async () => {
  const destination = "https://example.com/exam?q=secret%2Fvalue#part/9000";
  await send("start", config);
  beforeNavigate({ frameId: 0, tabId: 42, url: destination });
  const blockedSender = {
    ...sender,
    url: "chrome-extension://test-extension/blocked.html",
    tab: { id: 42, incognito: false },
  };
  const first = await send("get", {}, blockedSender);
  assert.equal(first.data.handoff.destination, destination);
  assert.ok(first.data.handoff.id);
  memory = structuredClone(memory);
  const reloaded = await send("get", {}, blockedSender);
  assert.deepEqual(reloaded.data.handoff, first.data.handoff);
  const stale = await send(
    "access",
    { url: destination, handoffId: "wrong-token", reason: "Read source", minutes: 5 },
    blockedSender,
  );
  assert.match(stale.error, /expired/);
  await send(
    "access",
    { url: destination, handoffId: first.data.handoff.id, reason: "Read source", minutes: 5 },
    blockedSender,
  );
  assert.equal((await send("get", {}, blockedSender)).data.handoff, null);
});

test("damaged-state export requires confirmation before reset", async () => {
  state = { session: null, history: 1 };
  const exported = await send("export-damaged");
  assert.equal(exported.data.damagedExport.local.history, 1);
  const denied = await send("reset-damaged", { confirm: true });
  assert.match(denied.error, /Export.*first/);
  const reset = await send("reset-damaged", { confirm: true, exportConfirmed: true });
  assert.equal(reset.data.session, null);
  assert.deepEqual(state, { session: null, history: [] });
});
