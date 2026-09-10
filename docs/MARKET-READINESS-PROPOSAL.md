# Lock in: market-readiness proposal

Drafted 9 September 2026. This is a living engineering proposal and delivery record, not a claim that every possible defect has been found or that a store has approved the product.

## Product direction

Lock in serves people whose focused work still needs the internet: students using exam portals, writers researching, and developers using documentation. Its strongest existing distinction is task-specific boundaries down to an exact URL, with a rule checker, deliberate temporary access, and an always-available recovery path. Preserve the local, account-free model and clear privacy explanation. Validate demand with observed first-session usability and repeat use before adding accounts, paid plans, cloud sync, schedules, or AI features.

## Confirmed gaps and proposed delivery

| ID | Priority | Finding | Proposed fix / acceptance |
| --- | --- | --- | --- |
| WEB-01 | High | Home offers raw ZIP links beside a simulated session. Downloading does not install an extension; browser-specific steps are missing from the immediate flow. | Add a dedicated, responsive download page with explicit manual installation steps, browser support status, accessible controls, and preview distinction. Link it prominently from home. |
| WEB-02 | Medium | Guide and privacy links open raw Markdown instead of readable website pages; the mobile header hides the guide. | Add readable support and privacy pages, linked from download and workspace surfaces at small widths. |
| REL-01 | High | Release directories are copied over without cleaning; removed files can survive into ZIPs. ZIP timestamps make identical inputs produce different packages. | Luna packaging audit to implement clean, deterministic packaging and artifact checksums with regression validation. |
| REL-02 | High | No store listing is live. Publisher identity/contact, final listing assets, Firefox signing, and Apple wrapper/signing remain incomplete. | Prepare platform-specific release checklist and submission assets where possible. Keep manual downloads honest; never invent store links, approval, or Safari compatibility. Record owner/account requirements explicitly. |
| UX-01 | Medium | Damaged preview data can be deleted immediately without confirmation. | Add explicit confirmation and keep export available before deletion. |
| SEC-01 | High | Security review pending for message authorization, persisted state validation, rule enforcement, worker restart handling and private contexts. | Luna audit: record confirmed bugs, add targeted regression tests and implement fixes before release. |
| QA-01 | High | Previously recorded browser tests do not certify the revised build on every browser/OS. | Run existing unit/integration tests, typecheck, lint, build, packaging checks and feasible browser tests; record exact results and untested targets. |

## Work allocation

- Parent: proposal, website/download/support/privacy UI, integration review, verification and hosting.
- Luna security agent: extension/core security and correctness audit, then bounded fixes.
- Luna release agent: manifests, packaging, official store requirements, then bounded release fixes.
- Luna product QA agent: extension UI/accessibility, product opportunities and targeted tests, then bounded fixes.

The proposal will gain detailed confirmed findings before the corresponding fixes are assigned. Source was backed up outside the project before changes because this checkout has no Git repository.

## Differentiation and finishing priorities

1. Explain precisely which pages a task permits before a session starts; use the existing rule checker to reduce accidental lockouts.
2. Make trust visible: no account, local records, honest permission explanations, private-mode limitations, and clear recovery.
3. Turn installation into a guided journey and distinguish a website preview from actual browser enforcement.
4. Improve resilience and useful error recovery so a worker connection failure does not look like lost data or a frozen product.
5. Make controls and feedback usable with keyboard navigation, screen readers, narrow windows, and reduced motion.

## Release gates and external dependencies

A production launch requires actual publisher accounts, a support contact chosen by the owner, policy-compliant store listings, signed Firefox distribution, and platform validation. Safari requires an Apple platform build/signing environment and a separate tested wrapper; a Chromium ZIP cannot meet that requirement. These are release gates, not implementation claims. Hosting a reviewable website does not imply store publication.

## Validation and delivery record

Pending implementation and integration. Findings, commands/results, deliverables, residual risks, and publisher actions will be appended below.

## Audit findings assigned for implementation

| ID | Priority | Evidence | Fix and owner |
| --- | --- | --- | --- |
| UX-02 | Medium | Extension active screen uses h2 after setup h1 is hidden; timer lacks a descriptive name and expiry has no useful announcement. The web preview retains its intro h1. | Luna QA: extension active h1, named timer, low-frequency live feedback. |
| UX-03 | Medium | Popup exposes generic worker errors without retry; dashboard delete promise is not caught. | Luna QA: recoverable worker feedback, explicit retry, guarded delete/error handling. |
| UX-04 | Medium | Preview export reads damaged localStorage without guarding access; unavailable storage can make recovery export throw. | Parent: catch export failures, report access error and do not create a misleading backup. |
| REL-03 | High | Actual extension captures are 1280×1074/1119, while existing 1280×800 store image captures the web simulation. | Do not submit simulation as extension imagery. Prepare genuine product assets where feasible; retain platform-specific screenshot gates. |
| REL-04 | Medium | Browser-specific acceptance and publisher metadata are incomplete. | Luna release: explicit Chrome, Edge, Firefox, Opera and Safari submission checklist with official sources; do not invent a Gecko publisher ID. |

Baseline before integration: 63 unit/integration tests pass. QA agent also reports lint, typecheck, build and 16 existing Playwright tests passing. These are baseline results, not verification of the final changes.

## Security audit findings

| ID | Priority | Finding and reproduction | Resolution plan |
| --- | --- | --- | --- |
| SEC-02 | High | In block mode, a blocked domain such as youtube.com can be visited as youtube.com. with a terminal DNS dot; the engine and generated network regex do not treat these as the same host. | Luna security: canonicalize hostname comparison and align DNR patterns; regress root/subdomain/exact-URL cases and lookalikes. |
| SEC-03 | High | The web-accessible blocked page exposes privileged controls and can be embedded by an ordinary page, creating clickjacking exposure. | Luna security: deny control messages from subframes and add extension CSP framing protection; retain top-level blocked-page operation. |
| SEC-04 | Medium | DNR carries the complete blocked destination in a fragment, which may include sensitive query values visible in a tab URL. No server transfer or saved attempt path was found. | Investigate a destination handoff that preserves exact-page recovery; retain explicit privacy disclosure and record limitations rather than silently removing required query/fragment data. |

## Owner decision: publisher details

The owner confirmed on 9 September 2026 that no publisher name or support/privacy email has been chosen. Leave these fields empty in the submission template and flag them as required before store submission. Do not create accounts or invent contact information. This does not block local packages or a private website review, but it blocks a finished public store listing.

Production dependency audit: `npm audit --omit=dev --json` reports zero known vulnerabilities on 9 September 2026. This registry result does not substitute for the code-level security review above.

### SEC-05: development dependency advisories

The full dependency audit found 9 affected dependency nodes (7 high, 2 moderate), all in development/build tooling. Three root advisories affect `sharp` image decoding, `image-size` malformed-image parsing, and `adm-zip` extraction through destination symlinks. The shipped extension includes none of these dependencies. Production-only audit is clean.

Plan: override the existing sharp dependency to patched 0.35.4 and revalidate packaging/build. The registry currently reports image-size 2.0.2 and adm-zip 0.6.0 as latest, both still affected; suggested web-ext downgrade still depends on affected parsers and is not a verified fix. Retain current validator, document remaining development-only advisories, and avoid processing untrusted image/archive inputs with these tools pending upstream patches.

### Delivery scope decisions

- Publisher/contact fields will stay intentionally empty, as requested by the owner. The Gecko ID remains a development placeholder until a stable publisher choice is made.
- The new download page is `/download`; the original `/` interactive workspace is preserved to avoid breaking existing preview sessions and links.
- Use official browser-store links only after real listings exist. Developer ZIPs cannot be presented as one-click store installs.
- Safari packaging and signing require macOS/Xcode and an Apple developer distribution workflow unavailable in this workspace. No Safari compatibility is claimed.
- No customer accounts, billing, cloud synchronization, or remote analytics were added. These need product validation and a separate data/security design.

### Differentiation roadmap after this release

| Opportunity | User benefit | Validation before investment |
| --- | --- | --- |
| Task-aware boundaries with exact-page rules | Keep an exam or document available without allowing an entire distracting website | Observe real sign-in and multi-domain workflows; measure accidental recovery use with opt-in research, not background tracking |
| Preflight affected-tab review | Avoid surprising users by redirecting unfinished work | Prototype a local read-only list of tabs that would redirect; user must explicitly start the session |
| Explain the matching rule on a blocked page | Make a restriction understandable and easy to correct next time | Compare “explicit domain block” vs “outside allowed pages” copy in a small usability study |
| Reusable personal task setups | Reduce repeated configuration without accounts | Validate whether existing “Use last setup” is enough before adding a saved-template library |
| Accessible recovery and private-by-default records | Give users control without shame or intrusive tracking | Keyboard/screen-reader tests and clear deletion/export flows before broader distribution |

A sustainable market product also needs a support process, a publisher identity, release ownership, real user feedback, and store maintenance. This implementation improves launch readiness; it does not establish product-market fit or validate commercial demand.

### Website implementation and intermediate checks

Implemented `/download`, `/support`, and `/privacy` with responsive layouts, semantic headings, skip navigation, readable installation instructions, explicit manual-install status, and genuine package links. Workspace links now lead to those pages. Damaged preview data export reports errors through the existing alert; deletion requires confirmation. Website icon now uses the product icon. Vite's JSON import uses the supported import attribute.

Intermediate validation: all three new routes returned HTTP 200; TypeScript and lint passed; the Sites production build passed. The only remaining build notice is Vinext's route-classification limitation. Final package integration and release verification follow below.

After patching sharp to 0.35.4, full npm audit reports 5 affected development dependency nodes (3 high, 2 moderate), rooted in the two unresolved parser/extraction advisories described above. No known production dependency advisories were reported.

### SEC-06: Firefox shared private context

Firefox uses a spanning extension background context: a private session's rules could affect normal tabs. This is a material behavior/privacy boundary, so the 0.2.1 release rejects starting private sessions in Firefox, clears legacy temporary private-session state, and explains the restriction in the popup. Regular sessions can still cover private windows with permission, and private attempts remain excluded. Chromium's split-context path is retained. A future Firefox private-session implementation requires a separately validated design; simply storing data in memory does not isolate the policy.

### SEC-04 mitigation and residual

The blocked page now removes the destination fragment from its displayed URL after capturing the return destination in memory. This reduces exposure in the address bar and current history entry, but does not prove the browser never transiently observed the original redirect. Reloading that page loses the temporary return destination. Opaque destination handoff remains future work; the privacy disclosure retains this limitation.

## Final implementation status

| Scope | Status |
| --- | --- |
| WEB-01/02 download journey and readable help/privacy | Implemented; responsive routes and linked from the preview |
| UX-01/04 damaged-data confirmation and guarded export | Implemented; damaged-storage browser regression passes |
| UX-02/03 extension accessibility and worker retry/delete feedback | Implemented; browser retry/headings/status checks pass |
| REL-01 deterministic clean packages and checksums | Implemented; isolated repeat-build regression passes |
| REL-02/03/04 store preparation | Versioned Chromium/Firefox packages, actual screenshot/icon candidates and blank publisher template prepared; external publication gates remain |
| SEC-02 hostname bypass | Fixed in engine and network rules; root/subdomain/dot/mixed-case/lookalike/exact-path regressions pass |
| SEC-03 framed control surface | CSP framing restriction and worker subframe rejection implemented; browser and worker checks pass |
| Persisted-state validation | Implemented; malformed state rejects without overwriting the original |
| SEC-04 destination fragment | Mitigated by removing displayed fragment after reading; transient browser exposure and reload behavior documented |
| SEC-05 dependency advisories | sharp patched; two root development-tool advisories remain upstream; production audit clean |
| SEC-06 Firefox private isolation | Unsafe private starts rejected and legacy temporary state cleared; real Firefox checks pass |

Validation: 71 Node checks pass, 17 Playwright scenarios verified (16 in the integrated run plus the corrected confirmation test rerun), Firefox smoke journeys pass, and Firefox manifest lint has zero findings. Full evidence and exact limitations are in `agent-work/validation/RESULTS.md`. This is a release candidate, not a statement of universal browser certification.

Publisher name/contact fields stay blank by owner request in `docs/store-metadata.template.json`. Before public release: fill those fields, choose stable Gecko identity, finish required store artwork, validate Edge/Opera, obtain Firefox signing and store review. Safari remains a separate Apple-platform port. The private hosted website review is separate from making a public customer-facing site and submitting store listings.

Final hostname follow-up: embedded-credentials navigation fails closed in the shared engine; blocked-domain DNR patterns also account for userinfo. Regression suite: 71 passed.


## Final delivery preference: local only

The owner requested local-only delivery for personal testing and later GitHub upload. No website deployment was started. Before that instruction arrived, the Sites workflow registered a private site and saved a private source/version; no further remote publication or push will occur. The final local source remains in this folder, with Git history and a source ZIP under `artifacts/lock-in-source.zip`.

Test the website at `http://localhost:3000/download`, with the original interactive preview at `/`, support at `/support`, and privacy at `/privacy`. Load `releases/chromium` as an unpacked extension or use the Firefox temporary-install instructions. The downloadable release is 0.2.1.
