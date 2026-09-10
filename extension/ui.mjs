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
const $ = (id) => document.getElementById(id),
  form = $('start');
let data = { session: null, history: [] };
let privateWindow = false;
let lastSessionId = '';
let lastLiveKey = '';
const target = location.pathname.endsWith('/blocked.html')
  ? location.hash.slice(1)
  : '';
// Keep the return destination in memory after the redirect; avoid leaving it in the address bar.
if (target) history.replaceState(null, '', location.pathname + location.search);
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
    $('blocked').hidden = !target;
    $('access').hidden = !options.accessLimit;
    $('no-access').hidden = !!options.accessLimit;
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
    }
    $('escape').hidden = !!s.escape;
    $('finish').hidden = !s.escape;
  }
  tick();
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
form.addEventListener(
  'submit',
  action(async (e) => {
    const f = new FormData(e.target);
    await call('start', setupConfig(f));
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
      reason: new FormData(e.target).get('reason'),
      minutes: sessionOptions(data.session).accessMinutes,
    });
    if (canVisit(data.session, target)) location.href = target;
  }),
);
await action(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  privateWindow = !!tab?.incognito || !!api.extension?.inIncognitoContext;
  await call('get');
  if (privateWindow) {
    $('privacy-session-note').hidden = false;
    if (data.privateSessionsSupported === false)
      $('privacy-session-note').textContent =
        'Firefox cannot isolate a private session from normal windows. Start a regular session in a normal window instead. Private attempts are still excluded from its history.';
  }
  if (target && data.session) await call('attempt', { url: target });
  if (!target && !data.session && tab?.url?.startsWith('http'))
    form.elements.focus.value = destination(tab.url).url;
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
    $('feedback').textContent =
      'Previous setup restored. Review it before starting.';
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
  if (e.target === $('check-url')) {
    checkedRule = false;
    $('rule-result').textContent = '';
  } else renderRuleCheck();
});
form.addEventListener('change', renderRuleCheck);
