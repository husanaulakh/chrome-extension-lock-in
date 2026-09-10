# Improvement backlog

This is a practical list of improvements for Lock in. It separates useful customer work from features that would add complexity without solving a demonstrated problem. The current demo remains local, account-free and free to use.

## Highest value next

### 1. Make installation unmistakable

Add a browser-specific install walkthrough after download, with a “Load unpacked” checklist for Chrome and Edge and a temporary-add-on checklist for Firefox. Detect whether the extension is running when the user opens the dashboard, and explain the difference between the website preview and browser enforcement. Keep the package download available for store submission.

### 2. Recover from background-worker problems

The popup should distinguish “the extension is not installed,” “the worker is restarting,” and “the browser denied private-window access.” Add a retry action, a link to the extension details page where supported, and a small diagnostic record that stays local. Do not hide a failed connection behind a generic error.

### 3. Improve first-session setup

Offer a few lightweight task templates only after observing repeated use, such as Study, Writing and Admin. Templates should fill the form for review and never start a session automatically. Keep the current last-setup restore because it reduces repeated typing without introducing accounts or sync.

### 4. Preserve work when a rule redirects a page

Before starting, show a clear warning that open tabs may redirect. Add an optional “review affected tabs” step where browser APIs permit it. The extension cannot guarantee recovery of unsaved web-app state, so the warning and recovery route must remain visible.

### 5. Better progress feedback

Keep the current dashboard descriptive rather than gamified. Add a small weekly reflection: task completed, useful session, or needs adjustment. Store the answer locally and make it optional. Do not turn distraction counts into a score; a high count can mean a hard task or a useful blocker.

## Browser and extension quality

- Test the Chromium package on current Chrome, Edge and Brave releases on Windows and macOS.
- Test Firefox after restart, sleep/wake, private-window permission changes and temporary add-on reloads.
- Add a Safari feasibility note only after an Apple wrapper and signing plan exist; do not imply the Chromium package supports Safari.
- Add browser restart tests for dynamic rules, alarms, expired sessions and private storage.
- Handle browser API failures with retry and recovery copy rather than silently continuing.
- Verify behavior with multiple windows, restored tabs, authentication redirects and another extension that also redirects pages.
- Keep the shared engine as the source of truth for preview, Chromium and Firefox.

## Accessibility and interaction

- Run keyboard-only journeys for setup, expanded resources, exact URL checking, recovery and export.
- Add screen-reader announcements for blocked navigation, a granted resource, a completed session and a failed background connection.
- Check 200% text enlargement and narrow popup widths in each supported browser.
- Keep the rule checker visible in the expanded panel and make its result understandable without color alone.
- Ensure every destructive action has a confirmation and every recovery action explains what it records.
- Prefer browser-native controls and reduced motion; avoid animated rewards, streaks and guilt-based copy.

## Privacy and trust

- Add an in-product “what is stored” summary beside the first permission explanation.
- Add a local data-management screen that shows approximate history size and offers export then deletion.
- Consider an optional automatic expiry for old history, disabled by default and clearly explained.
- Never collect page contents, passwords, cookies, keystrokes, remote analytics or browsing history outside recorded blocker attempts.
- Keep private sessions in memory-only storage and test that a private attempt never enters regular history.
- Review the privacy page whenever a new browser permission or data field is introduced.

## Rules and focus behavior

- Support a read-only “why was this blocked?” explanation that names the matching rule.
- Show the exact normalized URL rule before starting, including path, query and fragment.
- Add an explicit test for subdomains and lookalike domains whenever matching changes.
- Consider temporary access by exact URL only after users show that hostname grants are too broad; it increases setup and can interfere with sign-in flows.
- Consider schedules only after recurring-session research. A schedule adds timezone, sleep/wake and daylight-saving complexity.
- Do not add arbitrary regular expressions, desktop-app blocking or tamperproof claims without a separate threat model.

## Distribution and store readiness

- Replace placeholder publisher identity and privacy-policy contact details before submission.
- Capture store screenshots from the actual extension at the required dimensions.
- Run the package linter in CI and keep its development-only advisories documented.
- Produce reproducible Chromium and Firefox ZIPs with versioned release notes and checksums.
- Add a support page that explains installation, incognito/private permission and technical recovery.
- Never claim store approval, cross-platform certification or effectiveness from local tests.

## Product research

Before building larger features, run a small usability round with students, writers and developers who need online resources during focused work. Observe setup time, whether people understand exact URL versus website rules, whether the rule checker prevents failed sessions, and why they use recovery. Ask which records they want on the dashboard without collecting browsing data automatically.

Useful measures include setup completion, repeat use, sessions that finish without recovery, temporary-access requests followed by continued work, and permission-screen abandonment. Interpret all of them with participant comments; none is a clinical or productivity measure.

## What to avoid for now

Avoid accounts, cloud sync, social sharing, leaderboards, ads, paid feature gates, AI coaching, a desktop agent, broad page-content permissions and claims that the extension can make distraction impossible. They increase cost or privacy risk before the core browser experience has evidence of repeat value.

The next sensible slice is installation guidance plus worker diagnostics, followed by restart/accessibility testing. Those changes reduce the sharpest customer pain without changing the product’s promise.
