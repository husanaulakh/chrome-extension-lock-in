import { api } from './api.mjs';
import {
  startSession,
  isActive,
  canVisit,
  attemptVisit,
  grantAccess,
  requestEscape,
  finishSession,
  extendSession,
  restore,
} from './engine.mjs';
import { buildRules } from './rules.mjs';
let queue = Promise.resolve();
function serial(fn) {
  const pending = queue.then(fn);
  queue = pending.catch(() => {});
  return pending;
}
function privateSessionsSupported() {
  return api.runtime.getManifest?.().incognito !== 'spanning';
}
async function read() {
  const data = await api.storage.local.get(['session', 'history']);
  const memory = api.storage.session
    ? await api.storage.session.get('privateSession')
    : {};
  if (memory.privateSession && !privateSessionsSupported()) {
    await api.storage.session.remove('privateSession');
    memory.privateSession = null;
  }
  const saved = restore(
    JSON.stringify({
      version: 1,
      session: data.session === undefined ? null : data.session,
      history: data.history === undefined ? [] : data.history,
    }),
    0,
  );
  const privateSaved = memory.privateSession
    ? restore(
        JSON.stringify({
          version: 1,
          session: memory.privateSession,
          history: [],
        }),
        0,
      )
    : { session: null };
  return {
    session: privateSaved.session || saved.session,
    history: saved.history,
  };
}
async function save(data) {
  if (data.session?.private) {
    if (!api.storage.session)
      throw Error('Private-session storage is unavailable in this browser.');
    await api.storage.session.set({ privateSession: data.session });
  } else {
    if (api.storage.session) await api.storage.session.remove('privateSession');
    await api.storage.local.set(data);
  }
}
async function reconcile(data) {
  const now = Date.now();
  if (data.session && !isActive(data.session, now)) {
    if (!data.session.private)
      data.history = [
        finishSession(data.session, 'completed', now),
        ...data.history,
      ].slice(0, 100);
    data.session = null;
    await save(data);
  }
  const dnr = api.declarativeNetRequest;
  const privatePolicy = !!data.session?.private;
  const stale = privatePolicy
    ? await dnr.getDynamicRules()
    : await dnr.getSessionRules();
  if (stale.length) {
    const change = { removeRuleIds: stale.map((r) => r.id), addRules: [] };
    if (privatePolicy) await dnr.updateDynamicRules(change);
    else await dnr.updateSessionRules(change);
  }
  const existing = privatePolicy
    ? await dnr.getSessionRules()
    : await dnr.getDynamicRules();
  const desired = buildRules(data.session, api.runtime.getURL(''), now);
  const sameRules =
    existing.length === desired.length &&
    desired.every((rule) => {
      const previous = existing.find((item) => item.id === rule.id);
      return (
        previous &&
        previous.priority === rule.priority &&
        previous.action.type === rule.action.type &&
        previous.action.redirect?.regexSubstitution ===
          rule.action.redirect?.regexSubstitution &&
        previous.condition.regexFilter === rule.condition.regexFilter &&
        previous.condition.isUrlFilterCaseSensitive ===
          rule.condition.isUrlFilterCaseSensitive &&
        previous.condition.resourceTypes?.join(',') ===
          rule.condition.resourceTypes.join(',')
      );
    });
  if (!sameRules) {
    const change = {
      removeRuleIds: existing.map((r) => r.id),
      addRules: desired,
    };
    if (privatePolicy) await dnr.updateSessionRules(change);
    else await dnr.updateDynamicRules(change);
  }
  await api.alarms.clear('policy');
  if (data.session) {
    const future = [
      data.session.endsAt,
      ...data.session.grants.map((g) => g.until),
    ].filter((t) => t > now);
    await api.alarms.create('policy', { when: Math.min(...future) });
  }
  await api.action.setBadgeText({ text: data.session ? 'ON' : '' });
  return data;
}
async function inspectTab(tab, data) {
  if (!data.session || !tab?.id) return;
  // Queued events may describe a tab before its latest navigation.
  tab = await api.tabs.get(tab.id);
  const url = tab.pendingUrl || tab.url || '';
  if (url.startsWith(api.runtime.getURL(''))) return;
  const newTab =
    /^(chrome|edge|brave):\/\/newtab\/?$/.test(url) ||
    ['about:newtab', 'about:home'].includes(url);
  if (!newTab && !/^https?:\/\//.test(url)) return;
  if (
    (newTab && data.session.mode !== 'block') ||
    (!newTab && !canVisit(data.session, url))
  )
    await api.tabs.update(tab.id, {
      url:
        api.runtime.getURL('blocked.html') +
        '#' +
        (newTab ? 'https://new-tab.local/' : url),
    });
}
async function enforce(data) {
  for (const tab of await api.tabs.query({})) {
    try {
      await inspectTab(tab, data);
    } catch {
      /* A tab can close between query and update. */
    }
  }
}
async function handle(message, sender) {
  if (
    sender.id !== api.runtime.id ||
    !sender.url?.startsWith(api.runtime.getURL('')) ||
    (sender.frameId !== undefined && sender.frameId !== 0)
  )
    throw Error('Only top-level extension pages may control a session.');
  let data = await reconcile(await read());
  const p = message.payload || {};
  switch (message.type) {
    case 'get':
      await enforce(data);
      return {
        ...data,
        privateSessionsSupported: privateSessionsSupported(),
        incognitoAllowed: api.extension
          ? await api.extension.isAllowedIncognitoAccess()
          : false,
      };
    case 'clear-history':
      if (data.session)
        throw Error('Finish the active session before deleting history.');
      data.history = [];
      break;
    case 'start':
      if (p.private && !privateSessionsSupported())
        throw Error(
          'Private sessions are unavailable in Firefox because they cannot be isolated from normal windows. Start a regular session instead.',
        );
      if (data.session) throw Error('A session is already running.');
      data.session = startSession(p);
      break;
    case 'attempt':
      if (
        data.session &&
        !data.session.private &&
        !sender.tab?.incognito &&
        !api.extension?.inIncognitoContext
      ) {
        const result = attemptVisit(data.session, p.url);
        data.session = result.session;
      }
      break;
    case 'extend':
      data.session = extendSession(data.session, p.minutes);
      break;
    case 'dashboard': {
      const url = api.runtime.getURL('dashboard.html');
      const tabs = await api.tabs.query({});
      const existing = tabs.find((tab) => tab.url === url);
      if (existing) {
        await api.tabs.update(existing.id, { active: true });
        if (api.windows)
          await api.windows.update(existing.windowId, { focused: true });
      } else await api.tabs.create({ url });
      return data;
    }
    case 'access':
      data.session = grantAccess(data.session, p.url, p.reason, p.minutes);
      break;
    case 'escape':
      data.session = requestEscape(data.session, p.reason);
      break;
    case 'finish':
      if (p.kind !== 'escaped' && p.kind !== 'recovered')
        throw Error('Invalid exit.');
      {
        const ended = finishSession(data.session, p.kind);
        if (!data.session.private)
          data.history = [ended, ...data.history].slice(0, 100);
      }
      data.session = null;
      break;
    default:
      throw Error('Unknown action.');
  }
  await save(data);
  data = await reconcile(data);
  if (message.type === 'start' || message.type === 'access')
    await enforce(data);
  return data;
}
api.runtime.onMessage.addListener((message, sender, reply) => {
  serial(() => handle(message, sender)).then(
    (data) => reply({ data }),
    (error) => reply({ error: error.message }),
  );
  return true;
});
api.alarms.onAlarm.addListener(() => {
  serial(async () => {
    const data = await reconcile(await read());
    await enforce(data);
  }).catch(console.error);
});
api.runtime.onStartup.addListener(() => {
  serial(async () => {
    const data = await reconcile(await read());
    await enforce(data);
  }).catch(console.error);
});
api.runtime.onInstalled.addListener(() => {
  serial(async () => reconcile(await read())).catch(console.error);
});
api.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.url)
    serial(async () => inspectTab(tab, await reconcile(await read()))).catch(
      console.error,
    );
});
api.tabs.onActivated.addListener(({ tabId }) => {
  serial(async () =>
    inspectTab(await api.tabs.get(tabId), await reconcile(await read())),
  ).catch(console.error);
});

// Navigation events enforce full fragments and same-document History API routes.
const inspectNavigation = (details) => {
  if (details.frameId !== 0) return;
  serial(async () =>
    inspectTab(
      { id: details.tabId, url: details.url },
      await reconcile(await read()),
    ),
  ).catch(console.error);
};
api.webNavigation.onCommitted.addListener(inspectNavigation);
api.webNavigation.onHistoryStateUpdated.addListener(inspectNavigation);
api.webNavigation.onReferenceFragmentUpdated.addListener(inspectNavigation);

api.storage.onChanged?.addListener((changes, area) => {
  if (
    (area === 'local' && changes.session) ||
    (area === 'session' && changes.privateSession)
  )
    serial(async () => {
      const data = await reconcile(await read());
      await enforce(data);
    }).catch(console.error);
});
