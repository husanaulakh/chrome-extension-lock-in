# Lock in working guide

Read `docs/MARKET-READINESS-PROPOSAL.md` for scope and `agent-work/README.md` for handoffs before repeating an audit. Keep valuable agent drafts, patches and validation summaries in `agent-work/`; temporary browser profiles can be disposable. Do not include agent archives in the shipped extension or website public assets.

Use Ponytail's reviewed reuse-first approach: understand the affected flow, reuse existing code, standard library, platform controls and installed dependencies, then make the smallest correct change. Preserve validation, security, accessibility and data-loss handling. The reviewed upstream rules and license are under `agent-work/tools/ponytail/`.

For token efficiency, start with targeted `rg` queries and small reads. Summarize successful checks; save complete failure logs under `agent-work/validation/` and inspect them when needed. Use RTK for supported verbose commands when installed, but preserve exit codes and raw error logs. Use Graphify only for an unfamiliar cross-file relationship when its index is current; direct source is authoritative. Avoid whole-repository dumps, repeated passing checks and speculative dependency additions.

Authoritative engine: `core/engine.mjs`. Run `npm run package:extension` after engine/extension changes to regenerate copies and ZIPs. Validate logic changes with `npm test`, `npm run typecheck`, `npm run lint`, and relevant browser tests. Release artifacts derive their version from `extension/manifest.json`.

Publisher fields intentionally remain blank until supplied by the owner. Never claim store approval or Safari support from a successful ZIP build. Hosting follows the Sites skills; only the owning agent edits the Site checkout. Subagents return staged patches for owner integration.
