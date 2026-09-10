# Lock in release handoff — 9 September 2026

## Owner requests and decisions

- Audit bugs, security, UI polish and market differentiation; write a Markdown proposal and have Luna subagents implement fixes under parent supervision.
- Add a website download experience and prepare browser-store materials.
- Publisher name and support/privacy contact are intentionally blank. Owner will create them later.
- Preserve valuable subagent work inside the project, not solely in temporary storage.
- Review Ponytail, RTK, Graphify and other lightweight token-efficiency options without sacrificing quality.

## Work done

- Parent wrote `docs/MARKET-READINESS-PROPOSAL.md` before assigning fixes; it contains findings, decisions, evidence and remaining gates.
- Luna security audited engine/worker boundaries and staged canonical host matching, DNR updates, persisted-state validation and frame guards.
- Luna QA staged retry/error handling, live announcements, active headings and blocked-rule explanations.
- Luna release staged deterministic packaging, checksums, versioned artifacts and publisher templates.
- Parent reviewed and integrated stages; added integration regressions, isolated package regression tests, corrected synthetic expiry fixtures, strengthened frame guards, aligned exact-host DNR matching, restricted Firefox private starts and aligned disclosures.
- Parent added `/download`, `/support`, `/privacy`, guarded preview data export/deletion, version 0.2.1, real favicon and patched build dependency sharp 0.35.4.
- Baseline source backup is retained in `baseline/`. Agent snapshots preserve their handoffs; integrated source is authoritative.

## Validation status

Baseline: 63 unit/integration and 16 existing Playwright checks passed. Intermediate website build/type/lint and three new route checks passed. Integrated logic (71 tests), Chromium and Firefox verification passed; see `validation/` and the final proposal record before releasing.

## Release gates

Publisher/contact fields, store accounts, stable Gecko identity, signing, listing assets/review and Safari's separate Apple wrapper remain explicit gates. Edge/Opera need individual validation. Firefox private sessions are restricted because its spanning worker cannot isolate policy from normal windows. Normal sessions still cover permitted private windows and exclude their attempts.

## Tooling principles

Use compact summaries with raw failure evidence retained. Source and tests remain authoritative. Graph indexes are optional and must be refreshed. No token-savings percentage is guaranteed and these tools do not alter account quotas. Avoid global hooks or configuration changes unless reviewed and needed.


## Final delivery preference: local only

The owner requested local-only delivery for personal testing and later GitHub upload. No website deployment was started. Before that instruction arrived, the Sites workflow registered a private site and saved a private source/version; no further remote publication or push will occur. The final local source remains in this folder, with Git history and a source ZIP under `artifacts/lock-in-source.zip`.

Test the website at `http://localhost:3000/download`, with the original interactive preview at `/`, support at `/support`, and privacy at `/privacy`. Load `releases/chromium` as an unpacked extension or use the Firefox temporary-install instructions. The downloadable release is 0.2.1.
