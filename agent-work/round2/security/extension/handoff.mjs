// A blocked destination is held only in extension session storage.  The
// browser-visible redirect contains no destination or user-controlled data.
export const HANDOFF_STORAGE_KEY = "blockedHandoffs";
export const HANDOFF_TTL_MS = 5 * 60 * 1000;
export const MAX_HANDOFF_DESTINATION_LENGTH = 32768;
const MAX_HANDOFFS = 100;

function validTabId(tabId) {
  return Number.isInteger(tabId) && tabId >= 0;
}

function validEntry(entry, now) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.id === "string" &&
    entry.id.length >= 16 &&
    entry.id.length <= 128 &&
    typeof entry.destination === "string" &&
    entry.destination.length > 0 &&
    entry.destination.length <= MAX_HANDOFF_DESTINATION_LENGTH &&
    Number.isFinite(entry.createdAt) &&
    Number.isFinite(entry.expiresAt) &&
    entry.expiresAt > now &&
    entry.createdAt <= now &&
    entry.expiresAt - entry.createdAt <= HANDOFF_TTL_MS
  );
}

export function pruneHandoffs(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw)
    .filter(([tabId, entry]) => validTabId(Number(tabId)) && validEntry(entry, now))
    .sort(([, a], [, b]) => b.createdAt - a.createdAt)
    .slice(0, MAX_HANDOFFS);
  return Object.fromEntries(entries);
}

function opaqueId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues)
    throw Error("Secure destination handoff is unavailable.");
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function putHandoff(raw, tabId, destination, now = Date.now(), id = opaqueId()) {
  if (
    !validTabId(tabId) ||
    typeof destination !== "string" ||
    !destination ||
    destination.length > MAX_HANDOFF_DESTINATION_LENGTH
  )
    throw Error("Invalid destination handoff.");
  const handoffs = pruneHandoffs(raw, now);
  const entry = {
    id,
    destination,
    createdAt: now,
    expiresAt: now + HANDOFF_TTL_MS,
  };
  handoffs[String(tabId)] = entry;
  return { handoffs, entry };
}

export function getHandoff(raw, tabId, now = Date.now()) {
  if (!validTabId(tabId)) return null;
  return pruneHandoffs(raw, now)[String(tabId)] ?? null;
}

export function removeHandoff(raw, tabId, expectedId = null, now = Date.now()) {
  const handoffs = pruneHandoffs(raw, now);
  const key = String(tabId);
  if (!expectedId || handoffs[key]?.id === expectedId) delete handoffs[key];
  return handoffs;
}
