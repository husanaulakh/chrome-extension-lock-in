import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRules } from "../extension/rules.mjs";
import { startSession } from "../core/engine.mjs";
import {
  HANDOFF_TTL_MS,
  getHandoff,
  pruneHandoffs,
  putHandoff,
  removeHandoff,
} from "../extension/handoff.mjs";

const exact = "https://Example.test/exam/path?q=secret%2Fvalue&next=%23route#part/9000";
const session = startSession({
  task: "Study",
  focus: "docs.example.test",
  minutes: 25,
  level: "committed",
  resources: [],
});

test("DNR redirect carries no destination fragment or query", () => {
  const redirect = buildRules(session, "chrome-extension://id/")[0];
  assert.equal(redirect.action.redirect.regexSubstitution, "chrome-extension://id/blocked.html");
  assert.doesNotMatch(redirect.action.redirect.regexSubstitution, /\\0|#|\?/);
});

test("per-tab handoff preserves exact query and hash without exposing it in redirect", () => {
  const now = 1_000_000;
  const { handoffs, entry } = putHandoff({}, 17, exact, now, "opaque-tab-token-17");
  assert.equal(entry.destination, exact);
  assert.equal(getHandoff(handoffs, 17, now + 1).destination, exact);
  assert.equal(entry.id, "opaque-tab-token-17");
  assert.equal(entry.id.includes(exact), false);
});

test("expired and malformed entries are unavailable after worker restart", () => {
  const now = 2_000_000;
  const raw = {
    7: {
      id: "expired-token-123456",
      destination: exact,
      createdAt: now - HANDOFF_TTL_MS - 1,
      expiresAt: now - 1,
    },
    8: { id: "valid-token-123456", destination: exact, createdAt: now - 1, expiresAt: now + 1000 },
    9: {
      id: "malformed-token-123456",
      destination: exact,
      createdAt: "bad",
      expiresAt: now + 1000,
    },
  };
  const clean = pruneHandoffs(raw, now);
  assert.equal(getHandoff(clean, 7, now), null);
  assert.equal(getHandoff(clean, 8, now).destination, exact);
  assert.equal(getHandoff(clean, 9, now), null);
});

test("stale token cannot clear a newer destination grant", () => {
  const now = 3_000_000;
  const first = putHandoff({}, 3, exact, now, "first-token-123456").handoffs;
  const second = putHandoff(
    first,
    3,
    "https://other.test/new#route",
    now + 1,
    "new-token-123456",
  ).handoffs;
  assert.equal(removeHandoff(second, 3, "first-token-123456", now + 1)["3"].id, "new-token-123456");
  assert.equal(removeHandoff(second, 3, "new-token-123456", now + 1)["3"], undefined);
});
