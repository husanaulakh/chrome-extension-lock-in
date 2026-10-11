# Preserved agent work

This folder retains the useful work from the 9 September 2026 Luna-assisted release audit. It is source history for review and continuation, not runtime product code. The authoritative integrated files live in `app`, `core`, `extension`, `scripts`, `tests`, and `docs`.

- `security/`: Luna security source snapshot; parent integration added regression tests, Firefox private-session restrictions and additional corrections.
- `product-qa/`: Luna extension UI/accessibility snapshot; parent integration may include later fixes.
- `store-readiness/`: Luna release packaging, submission docs and store capture script.
- `tools/`: reviewed efficiency-tool materials and usage records.
- `validation/`: preserved check logs and evidence.
- `round2/`: Sep 11–12 round-2 scratch consolidated from `lock-in-tool-work/` (Oct 11 2026): `product/` (standalone UI prototype), `release/` (v0.3.0 store scripts/assets), `security/` (handoff extension snapshot + tests), plus logs/screenshots; duplicates of `product-qa/`, `baseline/`, `tools/rtk`, `store-readiness` capture script and `package-site-wsl.sh` provenance were deduped against this folder.
- `HANDOFF.md`: current state, owner decisions and next steps.

Temporary browser profiles and dependency caches are not valuable source progress and may still be disposable. No credentials belong in this folder.
