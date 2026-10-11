/** Local-only, bounded task setup storage and read-only preflight helpers. */
import { startSession } from './engine.mjs';

export const SETUPS_KEY = 'savedSetups';
export const MAX_SETUPS = 8;
export const MAX_SETUP_NAME = 48;
export const MAX_TASK = 120;
export const MAX_URL = 2048;
export const MAX_RESOURCES = 20;
export const MAX_BLOCKED = 100;

const LEVELS = new Set(['light', 'committed', 'locked']);
const MODES = new Set(['allow', 'block']);
const SCOPES = new Set(['domain', 'exact']);
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const lines = (value, max) => {
  if (!Array.isArray(value) || value.length > max) return null;
  const result = value.map(text);
  return result.length === value.length &&
    result.every((item) => item && item.length <= MAX_URL)
    ? result
    : null;
};

/** Return an authoritative engine-normalized setup or null if malformed. */
export function normalizeSetup(raw, { name = '', id = '' } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const task = text(raw.task);
  const focus = text(raw.focus);
  if (!task || task.length > MAX_TASK || !focus || focus.length > MAX_URL)
    return null;
  const mode = MODES.has(raw.mode) ? raw.mode : 'allow';
  const scope = SCOPES.has(raw.scope) ? raw.scope : 'domain';
  const level = LEVELS.has(raw.level) ? raw.level : 'committed';
  if (!Number.isInteger(raw.minutes) || raw.minutes < 1 || raw.minutes > 480)
    return null;
  const resources = lines(raw.resources, MAX_RESOURCES);
  const blocked = lines(raw.blocked, MAX_BLOCKED);
  const options = raw.options;
  if (
    !resources ||
    !blocked ||
    !options ||
    typeof options !== 'object' ||
    !Number.isInteger(options.accessLimit) ||
    !Number.isInteger(options.accessMinutes) ||
    !Number.isInteger(options.exitDelay)
  )
    return null;
  try {
    const session = startSession(
      {
        task,
        focus,
        scope,
        mode,
        resources,
        blocked,
        minutes: raw.minutes,
        level,
        options,
        private: false,
      },
      0,
    );
    return {
      id: text(id || raw.id) || makeId(),
      name: text(name || raw.name).slice(0, MAX_SETUP_NAME) || 'Untitled setup',
      task: session.task,
      focus: session.focus,
      mode: session.mode,
      scope: session.scope,
      resources: session.rules.slice(1).map((rule) => rule.value),
      blocked: session.blocked,
      minutes: raw.minutes,
      level: session.level,
      options: { ...session.options },
    };
  } catch {
    return null;
  }
}

export function setupConfig(setup) {
  const normalized = normalizeSetup(setup, setup);
  if (!normalized) return null;
  const { id: _id, name: _name, ...config } = normalized;
  return config;
}

export async function readSetups(storage) {
  try {
    const result = await storage.get(SETUPS_KEY);
    const raw = result?.[SETUPS_KEY];
    if (raw === undefined) return { setups: [], damaged: false };
    if (!Array.isArray(raw)) return { setups: [], damaged: true };
    const setups = raw.map((item) => normalizeSetup(item)).filter(Boolean);
    return { setups, damaged: setups.length !== raw.length };
  } catch (error) {
    return { setups: [], damaged: true, error };
  }
}

export async function writeSetups(storage, setups) {
  const safe = (Array.isArray(setups) ? setups : [])
    .map((item) => normalizeSetup(item))
    .filter(Boolean);
  if (safe.length > MAX_SETUPS)
    throw Error(`You can save up to ${MAX_SETUPS} setups.`);
  await storage.set({ [SETUPS_KEY]: safe });
  return safe;
}

export async function saveSetup(storage, name, config, existing = []) {
  const safe = normalizeSetup(config, { name });
  if (!safe) throw Error('Complete the setup before saving it.');
  const current = (Array.isArray(existing) ? existing : [])
    .map((item) => normalizeSetup(item))
    .filter(Boolean);
  const next = [safe, ...current.filter((item) => item.id !== safe.id)];
  if (next.length > MAX_SETUPS)
    throw Error(`You can save up to ${MAX_SETUPS} setups. Delete one first.`);
  await writeSetups(storage, next);
  return next;
}

export async function deleteSetup(storage, id, existing = []) {
  const next = (Array.isArray(existing) ? existing : []).filter(
    (item) => item?.id !== id,
  );
  await writeSetups(storage, next);
  return next;
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `setup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Private tabs are omitted and no URL is returned to the caller. */
export function affectedTabs(tabs, config, check, { limit = 8 } = {}) {
  if (!Array.isArray(tabs)) return [];
  const result = [];
  for (const tab of tabs) {
    if (result.length >= limit || !tab || tab.incognito) continue;
    const url = typeof tab.url === 'string' ? tab.url : '';
    if (!/^https?:\/\//i.test(url)) continue;
    try {
      if (check(config, url).allowed) continue;
      const parsed = new URL(url);
      const host = text(parsed.hostname).slice(0, 120) || 'this website';
      result.push({ id: tab.id, label: `Open tab on ${host}` });
    } catch {
      result.push({
        id: tab.id,
        label: 'Open tab with a page outside this setup',
      });
    }
  }
  return result;
}

export function ruleSummary(config) {
  const safe = normalizeSetup(config, config) || {};
  const focus = safe.focus || 'the selected website';
  const firstRule =
    safe.scope === 'exact' ? 'Focus exact page' : 'Focus website';
  const rules = [`${firstRule}: ${focus}`];
  if (safe.mode === 'block' && safe.blocked?.length)
    rules.push(`Block these domains: ${safe.blocked.join(', ')}`);
  if (safe.mode !== 'block' && safe.resources?.length)
    rules.push(`Additional resources: ${safe.resources.length}`);
  rules.push(`${safe.minutes || 25} minutes · ${safe.level || 'committed'}`);
  return rules;
}

export async function exportStorage(storage) {
  try {
    const raw = await storage.get(null);
    return {
      ok: true,
      json: JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), ...raw },
        null,
        2,
      ),
    };
  } catch (error) {
    return { ok: false, error };
  }
}
