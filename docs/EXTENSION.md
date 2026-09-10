# Install and use

## Chromium browsers

Run `npm run package:extension`. In Chrome, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select the absolute `releases/chromium` folder. Edge uses `edge://extensions`; Brave uses `brave://extensions`. Alternatively extract `public/lock-in-chromium.zip` first. Pin Lock in to the toolbar.

## Firefox

Use Firefox 142 or later. Open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select `releases/firefox/manifest.json`. Temporary add-ons disappear after a browser restart. The ZIP is prepared for AMO submission but is unsigned; permanent release installation requires Mozilla signing.

## Incognito and private windows

Chrome: Extensions → Lock in → Details → Allow in incognito. Edge: Allow in InPrivate. Brave uses Allow in Private. Firefox: `about:addons` → Lock in → Run in Private Windows → Allow. Browser wording may vary. Reopen the popup after changing permission. Lock in cannot enable this permission itself.

The popup reports coverage. If disabled, private windows are outside enforcement. Chromium uses split incognito contexts so its block page can open privately; Firefox uses its supported spanning context. Private navigation attempts are not recorded. A session started in a private window uses `storage.session` and session network rules and creates no saved report. Closing the entire browser clears this state; closing only a private window is not a guaranteed session reset. A normal session used privately remains a saved normal session. Explicit changes to that session remain saved.

## Rules

Entire website allows the exact hostname. Exact URL includes path, query and fragment. Optional resources accept domains or full page URLs. Blocked domains also cover subdomains and override ordinary allowances. Block selected domains mode leaves other websites available; Allow only resources mode redirects other HTTP(S) pages.

For the MCAT exam example, select Exact URL and paste the full address including `#exams/take_driver/9000`. Required authentication destinations may need separate resources. The underlying document is allowed by network rules; navigation events enforce the complete route, including hash and History API changes. A disallowed route can briefly render before redirection. Tests use an equivalent local fixture, not an authenticated MCAT account.

## Session controls

Start with 1–480 minutes. Add 1–480 minutes at a time during a session, to a total of 24 hours. Extensions preserve existing grant expirations and exit waits. Customize 0–10 temporary grants lasting 1–30 minutes each. Locked disables grants. Exit delay cannot be less than the chosen level's minimum and can be raised to 30 minutes.

Dashboard opens on demand and uses recorded sessions, with 7-day, 30-day or all-time views. Export JSON or delete history when no session is active. Technical recovery ends blocking immediately and records a recovery for regular sessions.

## Boundaries

Rules affect top-level HTTP(S) navigation. They do not block desktop applications, downloads, embedded content, privileged browser pages, other profiles, or other browsers. Starting a session can redirect existing tabs, so save work first. Disabling or removing the extension remains possible. Device-clock changes and browser scheduling affect timing. No cloud synchronization or account is required.

## Repeat work with less setup

Use last setup restores the latest recorded session's task, original duration and rules into the form. Review or edit them before starting. It never starts automatically and carries over no attempts, grants or exit wait. Private sessions are not saved or offered for reuse. The active timer also shows the expected finish time, updated when you add minutes.

## Check before starting

Inside More resources & blocking rules, paste a URL into “Will this page be allowed?” The result follows the current configuration, including exact paths, queries, fragments and explicit domain blocks. Editing a rule refreshes the result. No website is opened, session started or attempt recorded. This checks the rules, not whether a signed-in website will load or which authentication redirects it needs.

During a session, the preview and extension page titles show the countdown. Task names and destination URLs are not placed in the tab title. The title returns to Lock in after the session ends.


## Firefox private-session limit (0.2.1)

Firefox private sessions are unavailable in 0.2.1 because its shared background context cannot isolate them from normal windows. Regular sessions can cover private windows with permission; private attempts remain excluded. Chromium private sessions retain their existing temporary-storage behavior.
