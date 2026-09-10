# Validation record — 0.2.1, 9 September 2026

- Node regression suite: 71 passed, 0 failed. Full output: `unit-integration.log`.
- Playwright: 17 scenarios verified. Initial integrated run passed 16; damaged-data test needed to accept the newly added confirmation dialog. Its targeted rerun passed. No runtime change was required for that test correction.
- New browser coverage: worker disconnect/retry, active h1, named timer, status announcements and blocked-page frame prevention.
- Firefox real-browser harness passed setup checking, hash and History API boundaries, extending time, recovery, dashboard, private attempt exclusion and private-session start rejection.
- Firefox package validator: 0 errors, 0 notices, 0 warnings.
- Website: `/download`, `/support`, `/privacy` returned HTTP 200; typecheck/lint/build passed during integration. Final release build passed after packaging and documentation synchronization. All five published checksum entries match their local archives. No website was deployed.
- Packaging regression verifies stale file removal, manifest shapes, stable aliases, checksums and byte-identical rebuilds in an isolated test directory.
- Full dependency audit after sharp patch: 5 affected development nodes (3 high, 2 moderate) arising from image-size and adm-zip advisories with no verified patched upstream release at review time. Production-only audit: zero known advisories.
- Store screenshots/icons generated from actual packaged Chromium extension. They are listing candidates; browser-specific review is still required.

Not tested/certified: Edge and Opera binaries, Safari, mobile, all operating systems, assistive-technology hardware, every authentication flow and long-duration sleep/restart behavior. There is no claim of store approval or exhaustive absence of defects.

Final hostname follow-up: embedded-credentials navigation fails closed in the shared engine; blocked-domain DNR patterns also account for userinfo. Regression suite: 71 passed.
