import { api } from './api.mjs';
import {
  destination,
  domainMatches,
  canVisit,
  sessionRules,
  sessionOptions,
  POLICIES,
  reusableSetup,
  checkSetup,
} from './engine.mjs';
import {
  affectedTabs,
  deleteSetup,
  exportStorage,
  readSetups,
  ruleSummary,
  saveSetup,
  setupConfig as savedSetupConfig,
} from './setup.mjs';
const $ = (id) => document.getElementById(id),
  form = $('start');
let data = { session: null, history: [] };
let setups = [];
let privateWindow = false;
let lastSessionId = '';
let lastLiveKey = '';
let pendingStart = null;
let target = '';
let handoffId = '';
const blockedPage = location.pathname.endsWith('/blocked.html');
const time = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};
async function call(type, payload = {}) {
  let response;
  try {
    response = await api.runtime.sendMessage({ type, payload });
  } catch (cause) {
    const error = Error(
      'Lock in could not connect to its background worker. Try again or reopen the extension.',
    );
    error.workerConnection = true;
    error.cause = cause;
    throw error;
  }
  if (!response) {
    const error = Error(
      'Lock in could not connect to its background worker. Try again or reopen the extension.',
    );
    error.workerConnection = true;
    throw error;
  }
  if (response.error) throw Error(response.error);
  data = response.data;
  if (location.pathname.endsWith('/blocked.html') && type === 'get') {
    target =
      typeof data?.handoff?.destination === 'string'
        ? data.handoff.destination
        : '';
    handoffId = typeof data?.handoff?.id === 'string' ? data.handoff.id : '';
  }
  $('retry').hidden = true;
  if ($('feedback').textContent.startsWith('Lock in could not connect'))
    $('feedback').textContent = '';
  render();
  return data;
}
function isWorkerConnectionError(error) {
  return (
    error?.workerConnection ||
    /receiving end does not exist|message port closed|could not establish connection|context invalidated|disconnected/i.test(
      error?.message || '',
    )
  );
}
function userMessage(error) {
  if (isWorkerConnectionError(error))
    return 'Lock in could not connect to its background worker. Try again or reopen the extension.';
  return error?.message || 'Something went wrong. Try again.';
}
function showError(error) {
  $('feedback').textContent = userMessage(error);
  $('retry').hidden = !isWorkerConnectionError(error);
}
function action(fn) {
  return async (e) => {
    e?.preventDefault();
    $('feedback').textContent = '';
    $('retry').hidden = true;
    try {
      await fn(e);
    } catch (error) {
      showError(error);
    }
  };
}
function announce(key, message) {
  if (key === lastLiveKey) return;
  lastLiveKey = key;
  $('live-status').textContent = message;
}
function render() {
  if (data.incognitoAllowed !== undefined)
    $('incognito-status').textContent = data.incognitoAllowed
      ? 'Private-window access is enabled.'
      : 'Private-window access is off. Enable it in your browser’s extension settings.';
  $('reuse').hidden = !data.history.length || privateWindow;
  renderSetups();
  const s = data.session;
  $('setup').hidden = !!s;
  $('active').hidden = !s;
  if (s) {
    const options = sessionOptions(s);
    $('task-title').textContent = s.task;
    $('finish-at').textContent =
      'Finishes at ' +
      new Date(s.endsAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    $('level-badge').textContent = s.level;
    $('return').href = s.focus;
    $('allowed').replaceChildren();
    for (const rule of sessionRules(s)) {
      const p = document.createElement('p');
      p.className = 'resource-line';
      p.textContent = `${rule.kind === 'url' ? 'Exact URL' : 'Website'} · ${rule.value}`;
      $('allowed').append(p);
    }
    for (const domain of s.blocked ?? []) {
      const p = document.createElement('p');
      p.className = 'resource-line';
      p.textContent = 'Blocked · ' + domain;
      $('allowed').append(p);
    }
    for (const g of s.grants.filter((g) => g.until > Date.now())) {
      const p = document.createElement('p');
      p.className = 'resource-line';
      p.textContent = `Temporary · ${g.domain} · ${time(g.until - Date.now())}`;
      $('allowed').append(p);
    }
    $('blocked').hidden = !blockedPage;
    $('access').hidden = !target || !options.accessLimit;
    $('no-access').hidden = !!target && !!options.accessLimit;
    $('no-access').textContent = target
      ? 'Temporary access is off for this session.'
      : 'This blocked-page handoff has expired. Return to your original page and try again.';
    $('access-button').textContent =
      `Allow for ${options.accessMinutes} minutes`;
    if (target) {
      try {
        const domain = destination(target).domain;
        const explicitlyBlocked = (s.blocked ?? []).some((blocked) =>
          domainMatches(domain, blocked),
        );
        $('blocked-domain').textContent = explicitlyBlocked
          ? domain + ' is explicitly blocked for this session.'
          : domain + ' isn’t part of this session.';
      } catch {
        $('blocked-domain').textContent = 'This destination is unavailable.';
      }
    } else if (blockedPage) {
      $('blocked-domain').textContent =
        'This blocked-page handoff is no longer available. Return to the original page and try again.';
    }
    $('escape').hidden = !!s.escape;
    $('finish').hidden = !s.escape;
  }
  tick();
}

function renderSetups() {
  const section = $('saved-setups');
  if (!section) return;
  $('setup-name').disabled = privateWindow;
  $('save-setup').disabled = privateWindow;
  section.hidden = privateWindow || !setups.length;
  $('saved-setups-count').textContent = setups.length
    ? `${setups.length} of 8`
    : '';
  $('saved-setups-note').textContent = privateWindow
    ? 'Saved setups are unavailable in a private window.'
    : 'Saved locally in this browser. Review the fields before starting.';
  $('setup-list').replaceChildren();
  if (privateWindow) return;
  for (const setup of setups) {
    const row = document.createElement('div');
    row.className = 'setup-row';
    const name = document.createElement('strong');
    name.textContent = setup.name;
    const detail = document.createElement('span');
    detail.className = 'muted';
    detail.textContent = `${setup.task} · ${setup.minutes} min`;
    const load = document.createElement('button');
    load.type = 'button';
    load.dataset.setupAction = 'load';
    load.dataset.setupId = setup.id;
    load.textContent = 'Load';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.dataset.setupAction = 'delete';
    remove.dataset.setupId = setup.id;
    remove.textContent = 'Delete';
    const actions = document.createElement('span');
    actions.className = 'setup-row-actions';
    actions.append(load, remove);
    row.append(name, detail, actions);
    $('setup-list').append(row);
  }
}
function tick() {
  const s = data.session;
  if (!s) {
    document.title = 'Lock in';
    if (lastSessionId) announce('session-ended', 'Focus session ended.');
    lastSessionId = '';
    return;
  }
  if (lastSessionId !== s.id) {
    lastSessionId = s.id;
    lastLiveKey = '';
  }
  document.title = `${time(s.endsAt - Date.now())} — Lock in`;
  const now = Date.now();
  $('timer').textContent = time(s.endsAt - now);
  const remaining = time(s.endsAt - now);
  if (s.escape) {
    const ready = now >= s.escape.readyAt;
    announce(
      `${s.id}:escape:${ready ? 'ready' : 'waiting'}`,
      ready
        ? 'Your exit is ready.'
        : `Exit requested. Available in ${time(s.escape.readyAt - now)}.`,
    );
    $('wait').textContent = !ready
      ? 'Exit available in ' + time(s.escape.readyAt - now)
      : 'Your exit is ready.';
    $('finish').disabled = !ready;
  } else {
    announce(`${s.id}:active`, `Focus session active. ${remaining} remaining.`);
  }
}
const split = (value) =>
  (typeof value === 'string' ? value : '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
function setupConfig(f = new FormData(form)) {
  return {
    private: privateWindow,
    task: f.get('task'),
    focus: f.get('focus'),
    scope: f.get('scope'),
    mode: f.get('mode'),
    resources: split(f.get('resources')),
    blocked: split(f.get('blocked')),
    minutes: Number(f.get('minutes')),
    level: f.get('level'),
    options: {
      accessLimit: Number(f.get('accessLimit')),
      accessMinutes: Number(f.get('accessMinutes')),
      exitDelay: Number(f.get('exitDelay')),
    },
  };
}
function setFormFromSetup(c) {
  for (const key of ['task', 'focus', 'minutes', 'level', 'mode', 'scope'])
    form.elements.namedItem(key).value = c[key];
  form.elements.namedItem('resources').value = c.resources.join('\n');
  form.elements.namedItem('blocked').value = c.blocked.join('\n');
  for (const [key, value] of Object.entries(c.options))
    form.elements.namedItem(key).value = value;
  form.elements.scope.dispatchEvent(new Event('change'));
  form.elements.mode.dispatchEvent(new Event('change'));
  $('resources-panel').hidden = !(c.resources.length || c.blocked.length);
  $('more-resources').setAttribute(
    'aria-expanded',
    String(!$('resources-panel').hidden),
  );
  policy();
}

function showPreflight(config, tabs, note = '') {
  pendingStart = config;
  $('preflight').hidden = false;
  $('preflight-summary').textContent = tabs.length
    ? `${tabs.length} open tab${tabs.length === 1 ? '' : 's'} would be redirected when this session starts.`
    : 'No open tabs would be redirected when this session starts.';
  $('preflight-tabs').replaceChildren();
  for (const tab of tabs) {
    const item = document.createElement('li');
    item.textContent = tab.label;
    $('preflight-tabs').append(item);
  }
  $('preflight-note').textContent =
    note ||
    'Private-window tabs are omitted from this review. Lock in will not start until you confirm.';
  $('rule-summary').replaceChildren();
  for (const line of ruleSummary(config)) {
    const item = document.createElement('p');
    item.textContent = line;
    $('rule-summary').append(item);
  }
  $('confirm-start').focus();
}

async function reviewStart() {
  const config = setupConfig();
  let tabs;
  let note = '';
  try {
    tabs = await api.tabs.query({});
  } catch {
    tabs = [];
    note =
      'Open tabs could not be inspected. Review the setup carefully before confirming.';
  }
  showPreflight(
    config,
    tabs ? affectedTabs(tabs, config, checkSetup) : [],
    note,
  );
}
form.addEventListener(
  'submit',
  action(async (e) => {
    await call('start', setupConfig(new FormData(e.target)));
  }),
);
function policy() {
  const level = form.elements.level.value;
  const minimum = POLICIES[level].delay / 1000;
  form.elements.exitDelay.min = minimum;
  form.elements.exitDelay.value = Math.max(
    minimum,
    Number(form.elements.exitDelay.value),
  );
  form.elements.accessLimit.disabled = level === 'locked';
  $('policy').textContent =
    level === 'locked'
      ? '15-minute minimum exit wait. Temporary access is off.'
      : 'Choose your exit wait and temporary access below. Time can be extended during a session.';
}
form.elements.level.addEventListener('change', policy);
policy();
form.elements.scope.addEventListener('change', () => {
  $('scope-help').textContent =
    form.elements.scope.value === 'exact'
      ? 'Only this complete URL, including its query and # route.'
      : 'All pages on this exact hostname.';
});
form.elements.mode.addEventListener('change', () => {
  $('resources-label').hidden = form.elements.mode.value === 'block';
});
$('more-resources').addEventListener('click', () => {
  const open = $('resources-panel').hidden;
  $('resources-panel').hidden = !open;
  $('more-resources').setAttribute('aria-expanded', String(open));
});
$('confirm-start').addEventListener(
  'click',
  action(async () => {
    if (!pendingStart) return;
    const config = pendingStart;
    pendingStart = null;
    $('preflight').hidden = true;
    await call('start', config);
  }),
);
$('review-tabs').addEventListener('click', action(reviewStart));
$('edit-start').addEventListener('click', () => {
  pendingStart = null;
  $('preflight').hidden = true;
  $('review-start').focus();
});
$('extend').addEventListener(
  'submit',
  action(async (e) => {
    const minutes = Number(new FormData(e.target).get('minutes'));
    await call('extend', { minutes });
    $('feedback').textContent = `Added ${minutes} minutes.`;
  }),
);
$('escape').addEventListener(
  'submit',
  action(async (e) =>
    call('escape', { reason: new FormData(e.target).get('reason') }),
  ),
);
$('finish').addEventListener(
  'click',
  action(async () => call('finish', { kind: 'escaped' })),
);
$('recover').addEventListener(
  'click',
  action(async () => call('finish', { kind: 'recovered' })),
);
$('retry').addEventListener(
  'click',
  action(async () => {
    await call('get');
    $('feedback').textContent = 'Connection restored.';
  }),
);
$('dashboard').addEventListener(
  'click',
  action(async () => call('dashboard')),
);
$('access').addEventListener(
  'submit',
  action(async (e) => {
    await call('access', {
      url: target,
      handoffId,
      reason: new FormData(e.target).get('reason'),
      minutes: sessionOptions(data.session).accessMinutes,
    });
    if (canVisit(data.session, target)) location.href = target;
  }),
);
await action(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  privateWindow = !!tab?.incognito || !!api.extension?.inIncognitoContext;
  const stored = await readSetups(api.storage.local);
  setups = stored.setups;
  await call('get');
  if (privateWindow) {
    $('privacy-session-note').hidden = false;
    if (data.privateSessionsSupported === false)
      $('privacy-session-note').textContent =
        'Firefox cannot isolate a private session from normal windows. Start a regular session in a normal window instead. Private attempts are still excluded from its history.';
  }
  if (target && data.session) await call('attempt', { url: target });
  if (
    !target &&
    !data.session &&
    !privateWindow &&
    tab?.url?.startsWith('http')
  )
    form.elements.focus.value = destination(tab.url).url;
  renderSetups();
})();
setInterval(tick, 500);
setInterval(
  () =>
    call('get').catch((e) => {
      showError(e);
    }),
  5000,
);

$('reuse').addEventListener(
  'click',
  action(() => {
    if (data.session || !data.history.length || privateWindow) return;
    const c = reusableSetup(data.history[0]);
    setFormFromSetup(c);
    $('feedback').textContent =
      'Previous setup restored. Review it before starting.';
  }),
);

$('setup-list').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-setup-action]');
  if (!button || privateWindow) return;
  const setup = setups.find((item) => item.id === button.dataset.setupId);
  if (!setup) return;
  if (button.dataset.setupAction === 'load') {
    setFormFromSetup(savedSetupConfig(setup));
    $('feedback').textContent =
      `${setup.name} loaded. Review it before starting.`;
    form.elements.task.focus();
    return;
  }
  setups = await deleteSetup(api.storage.local, setup.id, setups);
  renderSetups();
  $('feedback').textContent = `${setup.name} deleted.`;
});

$('save-setup').addEventListener(
  'click',
  action(async () => {
    if (privateWindow)
      throw Error('Saved setups are unavailable in a private window.');
    const name = $('setup-name').value.trim();
    if (!name) {
      $('setup-name').focus();
      throw Error('Give this setup a name before saving it.');
    }
    setups = await saveSetup(api.storage.local, name, setupConfig(), setups);
    $('setup-name').value = '';
    renderSetups();
    $('feedback').textContent = `${name} saved locally.`;
  }),
);

function downloadJson(filename, json) {
  const href = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
$('export-storage').addEventListener(
  'click',
  action(async () => {
    const result = await exportStorage(api.storage.local);
    if (!result.ok)
      throw Error('Local data could not be read. Nothing was exported.');
    downloadJson('lock-in-local-data.json', result.json);
    $('storage-recovery-status').textContent =
      'Local data exported. Keep this file somewhere safe.';
  }),
);
$('reset-storage').addEventListener('click', () => {
  $('reset-confirmation').hidden = false;
  $('confirm-reset').focus();
});
$('cancel-reset').addEventListener('click', () => {
  $('reset-confirmation').hidden = true;
});
$('confirm-reset').addEventListener(
  'click',
  action(async () => {
    let response;
    try {
      response = await api.runtime.sendMessage({
        type: 'reset-storage',
        payload: { confirm: true },
      });
    } catch {
      response = null;
    }
    const recoverableWorkerFailure =
      !response ||
      /unknown action|damaged|unsupported|context invalidated|could not connect/i.test(
        response?.error || '',
      );
    if (response?.error && !recoverableWorkerFailure)
      throw Error(response.error);
    if (recoverableWorkerFailure)
      await api.storage.local.remove(['session', 'history', 'savedSetups']);
    setups = [];
    data = { session: null, history: [] };
    $('reset-confirmation').hidden = true;
    $('storage-recovery-status').textContent =
      'Local records reset. You can start a new setup.';
    render();
  }),
);

let checkedRule = false;
function renderRuleCheck() {
  if (!checkedRule) return;
  try {
    const result = checkSetup(setupConfig(), $('check-url').value);
    $('rule-result').textContent = result.allowed
      ? 'Allowed by these rules.'
      : 'Blocked by these rules.';
  } catch (e) {
    $('rule-result').textContent = e.message;
  }
}
$('check-rule').addEventListener('click', () => {
  checkedRule = true;
  renderRuleCheck();
});
form.addEventListener('input', (e) => {
  if (pendingStart && !e.target.closest('#preflight')) {
    pendingStart = null;
    $('preflight').hidden = true;
  }
  if (e.target === $('check-url')) {
    checkedRule = false;
    $('rule-result').textContent = '';
  } else renderRuleCheck();
});
form.addEventListener('change', (e) => {
  if (pendingStart && !e.target.closest('#preflight')) {
    pendingStart = null;
    $('preflight').hidden = true;
  }
  renderRuleCheck();
});
