// Pure policy functions. Time is an argument so waits and expiry are testable.
export const POLICIES = Object.freeze({
  light: { delay: 0, access: true },
  committed: { delay: 60_000, access: true },
  locked: { delay: 900_000, access: false },
});
export function destination(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 2048)
    throw Error('Enter a valid website.');
  const raw = input.trim();
  const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  const domain = url.hostname.toLowerCase().replace(/\.+$/, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (!domain || (!domain.includes('.') && domain !== 'localhost'))
  )
    throw Error('Use an HTTP or HTTPS website without login credentials.');
  return { url: url.href, domain };
}
/**
 * @typedef {{id:string,task:string,focus:string,allowed:string[],level:'light'|'committed'|'locked',startedAt:number,endsAt:number,grants:{domain:string,until:number}[],attempts:{domain:string,at:number}[],escape:null|{readyAt:number},status:string,finishedAt?:number,mode?:'allow'|'block',scope?:'domain'|'exact',rules?:{kind:string,value:string}[],blocked?:string[],options?:{accessLimit:number,accessMinutes:number,exitDelay:number},extensions?:{minutes:number,at:number}[],private?:boolean}} Session
 */
/** @returns {Session} */
export function startSession(config, now = Date.now()) {
  if (!config || typeof config !== 'object')
    throw Error('Provide a session configuration.');
  const task = typeof config.task === 'string' ? config.task.trim() : '';
  if (!task || task.length > 120)
    throw Error('Name your task in 1–120 characters.');
  if (
    !Number.isInteger(config.minutes) ||
    config.minutes < 1 ||
    config.minutes > 480
  )
    throw Error('Choose 1–480 whole minutes.');
  if (!Object.hasOwn(POLICIES, config.level))
    throw Error('Choose a commitment level.');
  const focus = destination(config.focus);
  if (!Array.isArray(config.resources) || config.resources.length > 20)
    throw Error('Use at most 20 resources.');
  const mode = config.mode ?? 'allow';
  const scope = config.scope ?? 'domain';
  if (
    !['allow', 'block'].includes(mode) ||
    !['domain', 'exact'].includes(scope)
  )
    throw Error('Choose a valid website rule.');
  const blockedInput = config.blocked ?? [];
  if (!Array.isArray(blockedInput) || blockedInput.length > 100)
    throw Error('Use at most 100 blocked domains.');
  const blocked = [...new Set(blockedInput.map((x) => destination(x).domain))];
  if (mode === 'block' && !blocked.length)
    throw Error('Add at least one domain to block.');
  if (blocked.some((d) => domainMatches(focus.domain, d)))
    throw Error(
      'Your focus website is also blocked. Remove the conflicting rule.',
    );
  const custom = config.options ?? {};
  const options = {
    accessLimit: custom.accessLimit ?? 3,
    accessMinutes: custom.accessMinutes ?? 5,
    exitDelay: custom.exitDelay ?? POLICIES[config.level].delay / 1000,
  };
  for (const [key, max] of [
    ['accessLimit', 10],
    ['accessMinutes', 30],
    ['exitDelay', 1800],
  ]) {
    if (
      !Number.isInteger(options[key]) ||
      options[key] < (key === 'accessMinutes' ? 1 : 0) ||
      options[key] > max
    )
      throw Error('Custom options are outside the supported range.');
  }
  if (config.level === 'locked') options.accessLimit = 0;
  if (options.exitDelay < POLICIES[config.level].delay / 1000)
    throw Error(
      'The exit wait cannot be less than the commitment level requires.',
    );
  const rules = [
    {
      kind: scope === 'exact' ? 'url' : 'domain',
      value: scope === 'exact' ? focus.url : focus.domain,
    },
    ...config.resources.map(resourceRule),
  ];
  const allowed = [
    ...new Set([
      focus.domain,
      ...config.resources.map((x) => destination(x).domain),
    ]),
  ];
  return {
    id: crypto.randomUUID(),
    mode,
    scope,
    rules,
    blocked,
    options,
    extensions: [],
    private: config.private === true,
    task,
    focus: focus.url,
    allowed,
    level: config.level,
    startedAt: now,
    endsAt: now + config.minutes * 60_000,
    grants: [],
    attempts: [],
    escape: null,
    status: 'active',
  };
}
export function isActive(session, now = Date.now()) {
  return !!session && session.status === 'active' && now < session.endsAt;
}
export function domainMatches(host, blocked) {
  return host === blocked || host.endsWith('.' + blocked);
}
export function resourceRule(input) {
  const parsed = destination(input),
    url = new URL(parsed.url);
  return url.pathname !== '/' || url.search || url.hash
    ? { kind: 'url', value: parsed.url }
    : { kind: 'domain', value: parsed.domain };
}
export function sessionRules(session) {
  return (
    session.rules ?? session.allowed.map((value) => ({ kind: 'domain', value }))
  );
}
export function sessionOptions(session) {
  return (
    session.options ?? {
      accessLimit: session.level === 'locked' ? 0 : 3,
      accessMinutes: 5,
      exitDelay: POLICIES[session.level].delay / 1000,
    }
  );
}
export function canVisit(session, input, now = Date.now()) {
  const { domain, url } = destination(input);
  if (!isActive(session, now)) return true;
  if ((session.blocked ?? []).some((d) => domainMatches(domain, d)))
    return false;
  if (session.mode === 'block') return true;
  return (
    sessionRules(session).some((r) =>
      r.kind === 'url' ? r.value === url : r.value === domain,
    ) || session.grants.some((g) => g.domain === domain && g.until > now)
  );
}
export function extendSession(session, minutes, now = Date.now()) {
  if (!isActive(session, now))
    throw Error('Only a running session can be extended.');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480)
    throw Error('Add 1–480 whole minutes.');
  if (session.endsAt + minutes * 60000 - session.startedAt > 24 * 60 * 60000)
    throw Error('A session can last at most 24 hours including extensions.');
  return {
    ...session,
    endsAt: session.endsAt + minutes * 60000,
    extensions: [...(session.extensions ?? []), { minutes, at: now }],
  };
}
export function attemptVisit(session, input, now = Date.now()) {
  const { domain } = destination(input);
  if (canVisit(session, input, now)) return { session, allowed: true, domain };
  return {
    session: {
      ...session,
      attempts: [...session.attempts, { domain, at: now }].slice(-2000),
    },
    allowed: false,
    domain,
  };
}
export function grantAccess(session, input, reason, minutes, now = Date.now()) {
  if (!isActive(session, now)) throw Error('There is no active session.');
  const options = sessionOptions(session);
  if (!POLICIES[session.level].access || !options.accessLimit)
    throw Error('Temporary access is disabled for this locked session.');
  if (
    typeof reason !== 'string' ||
    reason.trim().length < 5 ||
    reason.length > 240
  )
    throw Error('Give a reason in 5–240 characters.');
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > options.accessMinutes
  )
    throw Error(`Temporary access lasts 1–${options.accessMinutes} minutes.`);
  if (session.grants.length >= options.accessLimit)
    throw Error(
      `This session has used its ${options.accessLimit === 3 ? 'three' : options.accessLimit} access requests.`,
    );
  const { domain } = destination(input);
  if ((session.blocked ?? []).some((d) => domainMatches(domain, d)))
    throw Error(
      'An explicitly blocked domain cannot receive temporary access.',
    );
  return {
    ...session,
    grants: [
      ...session.grants,
      { domain, until: Math.min(now + minutes * 60_000, session.endsAt) },
    ],
  };
}
export function requestEscape(session, reason, now = Date.now()) {
  if (!isActive(session, now)) throw Error('There is no active session.');
  if (session.escape) return session;
  if (
    session.level !== 'light' &&
    (typeof reason !== 'string' ||
      reason.trim().length < 5 ||
      reason.length > 240)
  )
    throw Error('Give a reason in 5–240 characters.');
  return {
    ...session,
    escape: { readyAt: now + sessionOptions(session).exitDelay * 1000 },
  };
}
export function finishSession(session, kind, now = Date.now()) {
  if (!session || session.status !== 'active')
    throw Error('There is no active session.');
  if (!['completed', 'escaped', 'recovered'].includes(kind))
    throw Error('Unknown session outcome.');
  if (kind === 'completed' && now < session.endsAt)
    throw Error('The session timer has not finished.');
  if (kind === 'escaped' && (!session.escape || now < session.escape.readyAt))
    throw Error('Your escape wait is still running.');
  return {
    ...session,
    status: kind,
    finishedAt: Math.min(now, session.endsAt),
  };
}
export function report(session) {
  const domains = {};
  for (const a of session.attempts)
    domains[a.domain] = (domains[a.domain] || 0) + 1;
  return {
    task: session.task,
    status: session.status,
    seconds: Math.max(
      0,
      Math.floor(
        ((session.finishedAt ?? session.endsAt) - session.startedAt) / 1000,
      ),
    ),
    attempts: session.attempts.length,
    domains,
    accessRequests: session.grants.length,
  };
}
export function restore(raw, now = Date.now()) {
  if (!raw) return { session: null, history: [] };
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.history))
    throw Error(
      'Saved data is not supported. Export it before clearing storage.',
    );
  const validRecord = (record, active) => {
    if (record && record.rules !== undefined) {
      if (
        !['allow', 'block'].includes(record.mode) ||
        !['domain', 'exact'].includes(record.scope) ||
        !Array.isArray(record.rules) ||
        record.rules.length > 21 ||
        !record.rules.length ||
        !record.rules.every(
          (r) =>
            r &&
            ['url', 'domain'].includes(r.kind) &&
            typeof r.value === 'string' &&
            (r.kind === 'url'
              ? destination(r.value).url === r.value
              : destination(r.value).domain === r.value),
        ) ||
        !Array.isArray(record.blocked) ||
        record.blocked.length > 100 ||
        !record.blocked.every(
          (d) => typeof d === 'string' && destination(d).domain === d,
        ) ||
        !record.options ||
        !Number.isInteger(record.options.accessLimit) ||
        record.options.accessLimit < 0 ||
        record.options.accessLimit > 10 ||
        !Number.isInteger(record.options.accessMinutes) ||
        record.options.accessMinutes < 1 ||
        record.options.accessMinutes > 30 ||
        !Number.isInteger(record.options.exitDelay) ||
        record.options.exitDelay < POLICIES[record.level]?.delay / 1000 ||
        record.options.exitDelay > 1800 ||
        !Array.isArray(record.extensions) ||
        !record.extensions.every(
          (e) =>
            Number.isInteger(e.minutes) &&
            e.minutes > 0 &&
            Number.isFinite(e.at),
        )
      )
        return false;
    }
    if (
      !record ||
      typeof record.id !== 'string' ||
      !Object.hasOwn(POLICIES, record.level) ||
      typeof record.task !== 'string' ||
      !record.task.trim() ||
      record.task.length > 120 ||
      !Number.isFinite(record.startedAt) ||
      !Number.isFinite(record.endsAt) ||
      record.endsAt <= record.startedAt ||
      !Array.isArray(record.allowed) ||
      !record.allowed.length ||
      record.allowed.length > 21 ||
      !record.allowed.every(
        (domain) =>
          typeof domain === 'string' && destination(domain).domain === domain,
      ) ||
      !record.allowed.includes(destination(record.focus).domain) ||
      !Array.isArray(record.grants) ||
      record.grants.length > 10 ||
      !record.grants.every(
        (g) => g && typeof g.domain === 'string' && Number.isFinite(g.until),
      ) ||
      !Array.isArray(record.attempts) ||
      record.attempts.length > 2000 ||
      !record.attempts.every(
        (a) => a && typeof a.domain === 'string' && Number.isFinite(a.at),
      ) ||
      (record.escape !== null &&
        (!record.escape || !Number.isFinite(record.escape.readyAt)))
    )
      return false;
    return active
      ? record.status === 'active'
      : ['completed', 'escaped', 'recovered'].includes(record.status) &&
          Number.isFinite(record.finishedAt);
  };
  const s = data.session;
  if (
    (s && !validRecord(s, true)) ||
    !data.history.every((record) => validRecord(record, false))
  )
    throw Error(
      'Saved records are damaged. Export them, then use recovery to clear storage.',
    );
  if (s && !isActive(s, now))
    return {
      session: null,
      history: [finishSession(s, 'completed', now), ...data.history].slice(
        0,
        100,
      ),
    };
  return { session: s || null, history: data.history.slice(0, 100) };
}

/** Summaries describe observed time and outcomes, not a productivity score. */
export function summarize(history, days = 7, now = Date.now()) {
  if (![7, 30, 0].includes(days))
    throw Error('Choose 7 days, 30 days, or all time.');
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days ? days - 1 : 29));
  const rows = history.filter((s) => !days || s.startedAt >= start.getTime());
  const reports = rows.map(report);
  const seconds = reports.reduce((n, r) => n + r.seconds, 0),
    attempts = reports.reduce((n, r) => n + r.attempts, 0);
  const completed = rows.filter((s) => s.status === 'completed').length;
  const domains = {};
  for (const r of reports)
    for (const [domain, count] of Object.entries(r.domains))
      domains[domain] = (domains[domain] || 0) + count;
  const daily = Array.from({ length: days || 30 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      date: day.toISOString(),
      label: day.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      minutes: Math.floor(
        rows
          .filter(
            (s) => s.startedAt >= day.getTime() && s.startedAt < next.getTime(),
          )
          .reduce((n, s) => n + report(s).seconds, 0) / 60,
      ),
    };
  });
  return {
    sessions: rows.length,
    seconds,
    attempts,
    completed,
    escaped: rows.filter((s) => s.status === 'escaped').length,
    recovered: rows.filter((s) => s.status === 'recovered').length,
    completionRate: rows.length
      ? Math.round((completed / rows.length) * 100)
      : null,
    daily,
    domains: Object.entries(domains).sort(
      (a, b) => Number(b[1]) - Number(a[1]),
    ),
    rows,
  };
}

/** Copy only configuration, never previous attempts, permissions or exit state. */
export function reusableSetup(session) {
  const added = (session.extensions ?? []).reduce(
    (sum, e) => sum + e.minutes,
    0,
  );
  return {
    task: session.task,
    focus: session.focus,
    minutes: Math.max(
      1,
      Math.min(
        480,
        Math.round((session.endsAt - session.startedAt) / 60000) - added,
      ),
    ),
    level: session.level,
    mode: session.mode ?? 'allow',
    scope: session.scope ?? 'domain',
    resources: sessionRules(session)
      .slice(1)
      .map((r) => r.value),
    blocked: [...(session.blocked ?? [])],
    options: { ...sessionOptions(session) },
  };
}

/** Evaluate an unsaved setup without recording a visit or starting enforcement. */
export function checkSetup(config, input) {
  const url = destination(input).url;
  const session = startSession({
    ...config,
    task: config.task || 'Rule check',
  });
  return { url, allowed: canVisit(session, url) };
}
