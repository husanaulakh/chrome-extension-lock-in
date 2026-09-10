# Validation record

6 September 2026. Version 0.2.0. Linux, Node 22.21.0, Playwright 1.58.2, Chromium 145.0.7632.6 and Firefox 146.0.1. Tests use disposable profiles and local HTTP fixtures.

| Check | Result |
| --- | --- |
| Node unit and extension integration tests | 63 passed |
| Playwright preview and native Chromium tests | 16 passed |
| Actual Firefox ZIP installed through WebDriver | Exact URL, hash changes, History API, time extension, recovery and dashboard passed |
| Chromium incognito | Permission indicator, private blocking, no saved private session/history, recovery clears temporary rules passed |
| Firefox private windows | Coverage, private-attempt exclusion and memory-only private sessions passed |
| TypeScript, lint and production compilation | Passed |
| Mozilla web-ext manifest/package lint | 0 errors, 0 notices, 0 warnings |
| Runtime dependency audit | 0 findings |
| Full development dependency audit | 3 high findings in one development-tool dependency chain; see below |
| Preview visual checks | Desktop screenshot inspected; narrow layout and 200% text enlargement tested |
| Preview network/runtime journey | No external requests or page errors during the tested flow |
| WebMCP | Stub contract passed; native protocol interoperability not verified |

The exact-page checks exercise a local URL with the same fragment structure as the supplied MCAT example. They prove the routing implementation on that fixture, not compatibility with the authenticated MCAT service or its sign-in redirects. Navigation-event enforcement may occur after a disallowed route briefly renders.

A native test exposed stale queued tab events redirecting newer allowed navigation. Enforcement now re-reads the current tab before making its decision. Native tests also verify both fragment and History API route changes. Chromium's incognito test explicitly enables Developer mode in its disposable profile so an unpacked extension can reload after permission changes; production code never changes that setting.

## Dependency audit

`npm audit --omit=dev` reports zero findings. The full audit reports three high entries: `web-ext` → `addons-linter` → `image-size`. The underlying image-size 2.0.2 advisories concern infinite loops in ICNS, JXL and HEIF parsing: [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq). No newer image-size package was available when checked. A forced downgrade of the store-validation tool was not applied. Here it processes only the repository's generated PNG icons. These packages are not included in either extension ZIP. Update the linter when its dependency is fixed; do not feed it untrusted image packages.

## Artifacts and limits

Screenshots are in `artifacts/`: desktop, mobile, preview dashboard, actual extension dashboard, and a 1280×800 preview capture. Browser ZIPs are in `public/`; unpacked builds are in `releases/`. The source archive includes tests and documentation. CI is authored in `.github/workflows/check.yml`; it has not run on a remote repository.

This is a tested local demo, not store approval or a cross-platform certification. Edge, Brave and Opera use the Chromium package but were not tested individually. Safari is unsupported. Windows/macOS testing, sleep/wake, full browser restart, real authentication chains, screen readers and interactions with other extensions remain public-release checks. Attempt counts are retained observations, not a complete browsing audit or a measure of clinical attention. No customer effectiveness or retention study has been conducted. No store publication or hosted deployment occurred.

The combined-design revision restores the original blue serif emphasis and darker typography while retaining expandable controls. Added tests check reuse of the original configuration without old grants, attempts or private state, review before restarting, and the finish-time display. The native Chromium test also checks exact-rule setup reuse after recovery.

The pre-session checker is covered by a policy test and browser tests that verify exact fragment matching, live rule changes, and no stored session or network rules after checking. Chromium and Firefox also verify the countdown title. The checker does not perform network requests or verify third-party authentication.
