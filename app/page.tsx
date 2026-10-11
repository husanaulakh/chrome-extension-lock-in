/* oxlint-disable react/react-compiler -- Synchronizes browser storage and wall-clock deadlines after hydration; React Compiler is not enabled. */
'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  LockKeyhole,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronDown,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Dashboard from './dashboard-view';
import {
  POLICIES,
  startSession,
  isActive,
  attemptVisit,
  grantAccess,
  requestEscape,
  finishSession,
  restore,
  extendSession,
  sessionOptions,
  sessionRules,
  reusableSetup,
  checkSetup,
} from '../core/engine.mjs';
type Session = ReturnType<typeof startSession>;
const KEY = 'lock-in-v1';
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};
const lines = (text: string) =>
  text
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
export default function Home() {
  const [task, setTask] = useState(''),
    [focus, setFocus] = useState('docs.google.com'),
    [minutes, setMinutes] = useState(25),
    [level, setLevel] = useState('committed'),
    [mode, setMode] = useState('allow'),
    [scope, setScope] = useState('domain'),
    [resources, setResources] = useState(''),
    [blockedDomains, setBlockedDomains] = useState('');
  const [checkUrl, setCheckUrl] = useState(''),
    [checked, setChecked] = useState(false);
  const [more, setMore] = useState(false),
    [custom, setCustom] = useState(false),
    [accessLimit, setAccessLimit] = useState(3),
    [accessMinutes, setAccessMinutes] = useState(5),
    [extraWait, setExtraWait] = useState(0),
    [addMinutes, setAddMinutes] = useState(15);
  const [session, setSession] = useState<Session | null>(null),
    [history, setHistory] = useState<Session[]>([]),
    [now, setNow] = useState(0),
    [ready, setReady] = useState(false),
    [broken, setBroken] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [view, setView] = useState('session');
  const [url, setUrl] = useState('youtube.com'),
    [blocked, setBlocked] = useState(''),
    [reason, setReason] = useState(''),
    [escapeReason, setEscapeReason] = useState(''),
    [recovery, setRecovery] = useState(false);
  const latest = useRef({ session, ready, broken });
  latest.current = { session, ready, broken };
  useEffect(() => {
    try {
      const d = restore(localStorage.getItem(KEY));
      setSession(d.session);
      setHistory(d.history);
    } catch (e) {
      setError((e as Error).message);
      setBroken(true);
    }
    setView(
      new URLSearchParams(location.search).get('view') === 'dashboard'
        ? 'dashboard'
        : 'session',
    );
    setNow(Date.now());
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    document.title = session
      ? `${clock(session.endsAt - now)} — Lock in`
      : 'Lock in';
  }, [session, now]);
  useEffect(() => {
    if (!ready || broken) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, session, history }),
      );
    } catch {
      setError(
        'Your browser could not save this session. Keep this page open.',
      );
    }
  }, [session, history, ready, broken]);
  useEffect(() => {
    if (session && now && !isActive(session, now)) {
      const ended = finishSession(session, 'completed', now);
      setHistory((h) => [ended, ...h].slice(0, 100));
      setSession(null);
      setNotice('Session complete. Your time is yours again.');
      navigate('dashboard');
    }
  }, [session, now]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY)
        try {
          const d = restore(e.newValue);
          setSession(d.session);
          setHistory(d.history);
        } catch {
          setBroken(true);
          setError('Saved data changed and could not be read.');
        }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'start_focus_session',
            description:
              'Start a preview focus session with a hostname or exact URL rule. Does not control other browser tabs.',
            inputSchema: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                focus: { type: 'string' },
                minutes: { type: 'integer' },
                level: { enum: ['light', 'committed', 'locked'] },
                resources: { type: 'array', items: { type: 'string' } },
                scope: { enum: ['domain', 'exact'] },
                mode: { enum: ['allow', 'block'] },
                blocked: { type: 'array', items: { type: 'string' } },
              },
              required: ['task', 'focus', 'minutes', 'level', 'resources'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: (input: unknown) => {
              if (
                !latest.current.ready ||
                latest.current.broken ||
                latest.current.session
              )
                throw Error(
                  'Start from a ready workspace without an active session.',
                );
              const s = startSession(input);
              flushSync(() => {
                setSession(s);
                setNow(Date.now());
                navigate('session');
              });
              return { id: s.id, endsAt: s.endsAt };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  function navigate(next: string) {
    setView(next);
    window.history.replaceState(
      null,
      '',
      next === 'dashboard' ? '?view=dashboard' : location.pathname,
    );
  }
  function act(fn: () => void) {
    setError('');
    setNotice('');
    try {
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function setupConfig() {
    return {
      task,
      focus,
      minutes,
      level,
      resources: lines(resources),
      mode,
      scope,
      blocked: lines(blockedDomains),
      options: {
        accessLimit,
        accessMinutes,
        exitDelay: Math.max(
          extraWait,
          POLICIES[level as keyof typeof POLICIES].delay / 1000,
        ),
      },
    };
  }
  let ruleResult = '';
  if (checked) {
    try {
      const result = checkSetup(setupConfig(), checkUrl);
      ruleResult = result.allowed
        ? 'Allowed by these rules.'
        : 'Blocked by these rules.';
    } catch (e) {
      ruleResult = (e as Error).message;
    }
  }
  function start() {
    act(() => {
      if (session || broken)
        throw Error('Finish or recover the current session first.');
      const at = Date.now();
      setSession(startSession(setupConfig(), at));
      setNow(at);
      setBlocked('');
      setReason('');
      setEscapeReason('');
      setRecovery(false);
    });
  }
  function end(kind: string) {
    act(() => {
      const ended = finishSession(session, kind);
      setHistory((h) => [ended, ...h].slice(0, 100));
      setSession(null);
      setRecovery(false);
      navigate('dashboard');
    });
  }
  function download() {
    act(() => {
      const data = broken
        ? localStorage.getItem(KEY)
        : JSON.stringify({ version: 1, session, history }, null, 2);
      if (data === null) throw Error('No saved data is available to export.');
      const href = URL.createObjectURL(
        new Blob([data], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = href;
      a.download = 'lock-in-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setNotice(
        'Backup downloaded. Keep it private; it may contain personal URLs.',
      );
    });
  }
  const policy = session ? sessionOptions(session) : null;
  return (
    <main className="shell workspace-shell">
      <header className="masthead">
        <button
          className="wordmark"
          onClick={() => navigate('session')}
          aria-label="Lock in home"
        >
          <span className="brand-icon">
            <LockKeyhole size={19} />
          </span>
          Lock in
        </button>
        <nav aria-label="Workspace">
          <button
            className={
              view === 'session' ? 'nav-button selected' : 'nav-button'
            }
            disabled={!ready}
            onClick={() => navigate('session')}
          >
            Focus
          </button>
          <button
            className={
              view === 'dashboard' ? 'nav-button selected' : 'nav-button'
            }
            disabled={!ready}
            onClick={() => navigate('dashboard')}
          >
            <BarChart3 size={16} />
            Dashboard
          </button>
        </nav>
        <Link
          className="guide-link"
          href="/support"
          target="_blank"
          rel="noreferrer"
        >
          Help <ArrowUpRight size={14} />
        </Link>
      </header>
      <div className="feedback-container">
        <div role="alert" className={error ? 'feedback error' : 'hidden'}>
          {error}
        </div>
        <output className={notice ? 'feedback' : 'hidden'}>{notice}</output>
      </div>
      {view === 'dashboard' ? (
        <Dashboard history={history} onExport={download} />
      ) : (
        <div className="workspace">
          <section className="intro">
            <p className="preview-badge">Interactive preview</p>
            <h1>
              Make time for<br />one task.
            </h1>
            <p>Choose your task and try a focus session. This preview keeps its own records and does not block other tabs.</p>
            <div className="install-links">
              <Link href="/download" className="download-primary">
                Download the extension <ArrowUpRight size={14} />
              </Link>
              <Link href="/support">
                Installation &amp; support <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <section className="session-card">
            {!ready ? (
              <p>Opening your workspace…</p>
            ) : !session ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
              >
                <div className="card-heading">
                  <h2>Set your focus</h2>
                  <LockKeyhole size={18} />
                </div>
                {!!history.length && (
                  <button
                    type="button"
                    className="reuse-button"
                    onClick={() => {
                      const c = reusableSetup(history[0]);
                      setTask(c.task);
                      setFocus(c.focus);
                      setMinutes(c.minutes);
                      setLevel(c.level);
                      setMode(c.mode);
                      setScope(c.scope);
                      setResources(c.resources.join('\n'));
                      setBlockedDomains(c.blocked.join('\n'));
                      setAccessLimit(c.options.accessLimit);
                      setAccessMinutes(c.options.accessMinutes);
                      setExtraWait(c.options.exitDelay);
                      setMore(c.resources.length > 0 || c.blocked.length > 0);
                      setNotice(
                        'Previous setup restored. Review it before starting.',
                      );
                    }}
                  >
                    Use last setup <span>{history[0].task} ↗</span>
                  </button>
                )}
                <label className="field-label" htmlFor="task">
                  What are you working on?
                </label>
                <input
                  className="task-input"
                  id="task"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Finish the first draft"
                />
                <div className="field-row">
                  <label className="field-label" htmlFor="focus">
                    Focus website
                  </label>
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() =>
                      setScope(scope === 'domain' ? 'exact' : 'domain')
                    }
                  >
                    {scope === 'exact' ? 'Exact URL' : 'Entire website'}{' '}
                    <ChevronDown size={12} />
                  </button>
                </div>
                <input
                  className="website-input"
                  id="focus"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  required
                  placeholder="Paste a website or a specific page"
                />
                <p className="field-help">
                  {scope === 'exact'
                    ? 'Only this full URL, including its query and # route.'
                    : 'Any page on this exact hostname.'}
                </p>
                <button
                  className="resource-toggle"
                  type="button"
                  aria-expanded={more}
                  aria-controls="resources-panel"
                  onClick={() => setMore(!more)}
                >
                  More resources & blocking rules <ChevronDown size={15} />
                </button>
                {more && (
                  <div id="resources-panel" className="disclosure-panel">
                    <p className="field-label">Browsing rules</p>
                    <RadioGroup
                      value={mode}
                      onValueChange={(v) => setMode(String(v))}
                      className="rule-options"
                      aria-label="Browsing rules"
                    >
                      <label htmlFor="allow-mode">
                        <RadioGroupItem id="allow-mode" value="allow" />
                        Only allowed resources
                      </label>
                      <label htmlFor="block-mode">
                        <RadioGroupItem id="block-mode" value="block" />
                        Block selected domains
                      </label>
                    </RadioGroup>
                    {mode === 'allow' && (
                      <>
                        <label className="field-label" htmlFor="resources">
                          Additional resources
                        </label>
                        <textarea
                          id="resources"
                          rows={3}
                          value={resources}
                          onChange={(e) => setResources(e.target.value)}
                          placeholder={
                            'developer.mozilla.org\nhttps://example.com/specific-page#section'
                          }
                        />
                        <p className="field-help">
                          One per line. A hostname permits its pages; a full
                          path permits that URL. Leave empty for a single-page
                          session.
                        </p>
                      </>
                    )}
                    <label className="field-label" htmlFor="blocked-domains">
                      Domains to block
                    </label>
                    <textarea
                      id="blocked-domains"
                      rows={2}
                      value={blockedDomains}
                      onChange={(e) => setBlockedDomains(e.target.value)}
                      placeholder={'youtube.com\nreddit.com'}
                    />
                    <p className="field-help">
                      Includes subdomains. Explicit blocks override allowed
                      resources and temporary access.
                      {mode === 'block'
                        ? ' Other websites remain available.'
                        : ''}
                    </p>
                    <div className="rule-checker">
                      <label className="field-label" htmlFor="check-url">
                        Will this page be allowed?
                      </label>
                      <div className="inline-form">
                        <input
                          id="check-url"
                          value={checkUrl}
                          onChange={(e) => {
                            setCheckUrl(e.target.value);
                            setChecked(false);
                          }}
                          placeholder="Paste a URL to check"
                        />
                        <button type="button" onClick={() => setChecked(true)}>
                          Check URL
                        </button>
                      </div>
                      <output className="rule-result" aria-live="polite">
                        {ruleResult}
                      </output>
                      <p className="field-help">
                        Checks your current rules without opening the page or
                        starting a session.
                      </p>
                    </div>
                  </div>
                )}
                <label className="field-label" htmlFor="custom-duration">
                  How long?
                </label>
                <div className="durations">
                  {[25, 60, 120].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={minutes === n}
                      onClick={() => setMinutes(n)}
                    >
                      {n === 25 ? '25 min' : n === 60 ? '1 hour' : '2 hours'}
                    </button>
                  ))}
                  <input
                    id="custom-duration"
                    aria-label="Custom duration in minutes"
                    type="number"
                    min={1}
                    max={480}
                    value={[25, 60, 120].includes(minutes) ? '' : minutes || ''}
                    placeholder="Custom"
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                </div>
                <div className="field-row">
                  <p className="field-label" id="commitment-label">
                    Commitment
                  </p>
                  <button
                    type="button"
                    aria-expanded={custom}
                    aria-controls="custom-panel"
                    className="inline-link"
                    onClick={() => setCustom(!custom)}
                  >
                    <SlidersHorizontal size={13} /> Customize
                  </button>
                </div>
                <RadioGroup
                  aria-labelledby="commitment-label"
                  className="commitment-grid"
                  value={level}
                  onValueChange={(v) => setLevel(String(v))}
                >
                  {[
                    ['light', 'Light', 'Leave anytime'],
                    ['committed', 'Committed', '60-second exit'],
                    ['locked', 'Locked', '15-minute exit'],
                  ].map(([v, title, desc]) => (
                    <label
                      className={
                        level === v ? 'commitment selected' : 'commitment'
                      }
                      key={v}
                    >
                      <div>
                        <strong>{title}</strong>
                        <RadioGroupItem value={v} />
                      </div>
                      <span>{desc}</span>
                    </label>
                  ))}
                </RadioGroup>
                {custom && (
                  <div
                    className="disclosure-panel custom-grid"
                    id="custom-panel"
                  >
                    <label>
                      Access requests
                      <input
                        aria-label="Maximum access requests"
                        type="number"
                        min={0}
                        max={10}
                        disabled={level === 'locked'}
                        value={level === 'locked' ? 0 : accessLimit}
                        onChange={(e) => setAccessLimit(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Minutes per request
                      <input
                        aria-label="Minutes per access request"
                        type="number"
                        min={1}
                        max={30}
                        value={accessMinutes}
                        onChange={(e) =>
                          setAccessMinutes(Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Exit wait (seconds)
                      <input
                        type="number"
                        aria-label="Custom exit wait in seconds"
                        min={
                          POLICIES[level as keyof typeof POLICIES].delay / 1000
                        }
                        max={1800}
                        value={Math.max(
                          extraWait,
                          POLICIES[level as keyof typeof POLICIES].delay / 1000,
                        )}
                        onChange={(e) => setExtraWait(Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
                <p className="policy">
                  {level === 'locked'
                    ? 'Temporary access is off.'
                    : `${accessLimit} access requests, up to ${accessMinutes} minutes each.`}{' '}
                  You can add time while focusing.
                </p>
                <button className="start-button" disabled={broken}>
                  Lock in for {minutes || '…'} minutes <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <div className="active-session">
                <div className="card-heading">
                  <span className="eyebrow">FOCUS IN PROGRESS</span>
                  <span className="tag">{session.level}</span>
                </div>
                <h2>{session.task}</h2>
                <div className="timer" role="timer" aria-label="Time remaining">
                  {clock(session.endsAt - now)}
                </div>
                <p className="finish-at">
                  Finishes at{' '}
                  {new Date(session.endsAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <form
                  className="extend-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(() => {
                      setSession(extendSession(session, addMinutes));
                      setNotice(`Added ${addMinutes} minutes.`);
                    });
                  }}
                >
                  <label htmlFor="add-time">A little more time?</label>
                  <div>
                    <input
                      id="add-time"
                      aria-label="Minutes to add"
                      type="number"
                      min={1}
                      max={480}
                      value={addMinutes}
                      onChange={(e) => setAddMinutes(Number(e.target.value))}
                    />
                    <button className="quiet-button">
                      <Plus size={14} /> Add time
                    </button>
                  </div>
                </form>
                <a
                  className="start-button"
                  href={session.focus}
                  target="_blank"
                  rel="noreferrer"
                >
                  Return to your task <ArrowUpRight size={18} />
                </a>
                <details className="active-resources">
                  <summary>
                    Session resources <ChevronDown size={15} />
                  </summary>
                  {sessionRules(session).map(
                    (r: { kind: string; value: string }, i: number) => (
                      <p key={i} className="resource-line">
                        <span>
                          {r.kind === 'url' ? 'Exact URL' : 'Website'}
                        </span>
                        {r.value}
                      </p>
                    ),
                  )}
                  {(session.blocked ?? []).map((d) => (
                    <p className="resource-line" key={d}>
                      <span>Blocked</span>
                      {d}
                    </p>
                  ))}
                  {session.grants
                    .filter((g) => g.until > now)
                    .map((g, i) => (
                      <p className="resource-line" key={i}>
                        <span>Temporary · {clock(g.until - now)}</span>
                        {g.domain}
                      </p>
                    ))}
                </details>
                <div className="sandbox">
                  <p className="eyebrow">PREVIEW A DESTINATION</p>
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(() => {
                        const r = attemptVisit(session, url);
                        setSession(r.session);
                        setBlocked(r.allowed ? '' : r.domain);
                        setNotice(r.allowed ? `${r.domain} is allowed.` : '');
                      });
                    }}
                  >
                    <input
                      id="try-url"
                      aria-label="Test a destination"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                    <button>
                      Try <ArrowRight size={15} />
                    </button>
                  </form>
                  {blocked && (
                    <div className="block-screen">
                      <h3>Not right now.</h3>
                      <p>
                        {blocked} isn’t part of “{session.task}”.
                      </p>
                      {policy && policy.accessLimit > 0 ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            act(() => {
                              setSession(
                                grantAccess(
                                  session,
                                  url,
                                  reason,
                                  policy.accessMinutes,
                                ),
                              );
                              setNotice(
                                `${blocked} allowed for up to ${policy.accessMinutes} minutes.`,
                              );
                              setBlocked('');
                              setReason('');
                            });
                          }}
                        >
                          <label htmlFor="access-reason">
                            Need it for your task?
                          </label>
                          <input
                            id="access-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            minLength={5}
                            maxLength={240}
                            required
                            placeholder="What do you need it for?"
                          />
                          <button className="quiet-button">
                            Allow for {policy.accessMinutes} minutes
                          </button>
                        </form>
                      ) : (
                        <p>Temporary access is off for this locked session.</p>
                      )}
                      <button
                        className="inline-link"
                        onClick={() => setBlocked('')}
                      >
                        Back to the session
                      </button>
                    </div>
                  )}
                </div>
                <details className="escape">
                  <summary>Need to leave?</summary>
                  {!session.escape ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(() =>
                          setSession(requestEscape(session, escapeReason)),
                        );
                      }}
                    >
                      <label htmlFor="escape-reason">
                        {session.level === 'light'
                          ? 'Optional reason'
                          : 'Why are you leaving?'}
                      </label>
                      <input
                        id="escape-reason"
                        value={escapeReason}
                        onChange={(e) => setEscapeReason(e.target.value)}
                        required={session.level !== 'light'}
                        minLength={session.level === 'light' ? 0 : 5}
                        maxLength={240}
                      />
                      <button className="quiet-button">
                        Begin exit
                        {policy?.exitDelay
                          ? ` · ${policy.exitDelay} seconds`
                          : ''}
                      </button>
                    </form>
                  ) : (
                    <>
                      <p>
                        {now < session.escape.readyAt
                          ? `Exit available in ${clock(session.escape.readyAt - now)}.`
                          : 'Your exit is ready.'}
                      </p>
                      <button
                        className="quiet-button"
                        disabled={now < session.escape.readyAt}
                        onClick={() => end('escaped')}
                      >
                        End this session
                      </button>
                    </>
                  )}
                  <button
                    className="inline-link recovery-link"
                    onClick={() => setRecovery(true)}
                  >
                    Open recovery
                  </button>
                </details>
              </div>
            )}
            <p className="demo-label">
              Interactive preview. Install the extension to manage browser tabs.
            </p>
          </section>
        </div>
      )}
      {(recovery || broken) && (
        <section className="recovery">
          <h3>Technical recovery</h3>
          <p>
            {broken
              ? 'Saved data could not be loaded. Export it before clearing storage.'
              : 'Ends this session immediately and records a recovery. Use this when rules block essential work or something has broken.'}
          </p>
          <button className="quiet-button" onClick={download}>
            Export data
          </button>
          <button
            className="quiet-button"
            onClick={() => {
              if (broken) {
                if (
                  !window.confirm(
                    'Permanently delete damaged preview data? Export a backup first. This cannot be undone.',
                  )
                )
                  return;
                act(() => {
                  localStorage.removeItem(KEY);
                  setSession(null);
                  setHistory([]);
                  setBroken(false);
                });
              } else end('recovered');
            }}
          >
            {broken ? 'Clear damaged data' : 'End through recovery'}
          </button>
        </section>
      )}
      <footer>
        <span>Stay with what matters.</span>
        <Link href="/privacy" target="_blank" rel="noreferrer">
          Privacy
        </Link>
      </footer>
    </main>
  );
}
