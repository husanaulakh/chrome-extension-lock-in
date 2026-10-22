# Lock in

A focus tool for work that needs the internet. Choose one task, keep the right pages available, and decide the exit rules before starting. Every feature is available without payment or an account.

## Run

Requires Node 22.13+ and Python 3 for ZIP packaging.

```sh
npm ci
npm run package:extension
npm run dev
```

Open http://localhost:3000/download for the extension download and installation page. Support is at `/support`, privacy at `/privacy`, and the interactive preview at `/`. Dashboard is at http://localhost:3000/?view=dashboard. The website simulates blocking; install the extension to redirect other tabs. The extension works without the preview server.

## Try it

1. Enter a task and its website. Choose Entire website or Exact URL.
2. Open More resources & blocking rules to add references or block selected domains. These controls stay out of the way until needed.
3. Choose duration and commitment level. Customize temporary access and exit delay if needed.
4. Start. Use Add time to extend the deadline without resetting permissions or the exit wait.
5. Try a distraction in the preview, or navigate in the extension. Finish or use Technical recovery; open Dashboard for your actual records.

Exact URL includes path, query, and fragment. For the MCAT example, paste `https://www.mcatofficialprep.org/app/aamc-mcat-practice-exam-3#exams/take_driver/9000` and choose Exact URL. Add any required sign-in destinations separately. Local fixtures verify this route pattern; the authenticated MCAT service has not been tested.

## Browser packages

- `public/lock-in-chromium.zip`: Chrome 120+, Edge, Brave and other compatible Chromium browsers.
- `public/lock-in-firefox.zip`: Firefox 142+; temporary installation for the local demo.
- Safari requires a separate Apple extension wrapper and signing; it is not supported by these packages.

Chromium and Firefox were tested directly. Edge, Brave and Opera packages use the Chromium format but have not been tested individually. Store review and signing have not occurred.

Incognito/private windows require permission in the browser's extension settings. The popup shows whether coverage is enabled. Private attempts are excluded from history; sessions started privately use memory-only state and rules. See the [installation guide](docs/EXTENSION.md).

## Documentation

- [Installation and behavior](docs/EXTENSION.md)
- [Business report](docs/BUSINESS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Tests](docs/TESTING.md) and [validation record](docs/VALIDATION.md)
- [Store submission materials](docs/STORE-SUBMISSION.md)
- [Design decisions](DESIGN.md)
- [Improvement backlog](docs/IMPROVEMENT-BACKLOG.md)
- [Market-readiness proposal and delivery record](docs/MARKET-READINESS-PROPOSAL.md)

Recovery is always available. Browser settings, disabling the extension, and other browsers remain ways to leave a session. This is a commitment aid, not a tamperproof control.

## Repeat work with less setup

Use last setup restores the latest recorded session's task, original duration and rules into the form. Review or edit them before starting. It never starts automatically and carries over no attempts, grants or exit wait. Private sessions are not saved or offered for reuse. The active timer also shows the expected finish time, updated when you add minutes.

## Check before starting

Inside More resources & blocking rules, paste a URL into “Will this page be allowed?” The result follows the current configuration, including exact paths, queries, fragments and explicit domain blocks. Editing a rule refreshes the result. No website is opened, session started or attempt recorded. This checks the rules, not whether a signed-in website will load or which authentication redirects it needs.

During a session, the preview and extension page titles show the countdown. Task names and destination URLs are not placed in the tab title. The title returns to Lock in after the session ends.


## Firefox private-session limit (0.3.1)

Firefox private sessions are unavailable in 0.3.1 because its shared background context cannot isolate them from normal windows. Regular sessions can cover private windows with permission; private attempts remain excluded. Chromium private sessions retain their existing temporary-storage behavior.
