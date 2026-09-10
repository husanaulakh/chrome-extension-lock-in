# Testing

Tests use deterministic clocks, mocked extension APIs, local HTTP fixtures and disposable browser profiles. They do not control a personal browser profile or sign into the MCAT service.

```sh
npm ci
npm run package:extension
npm run check
npx playwright install --with-deps chromium firefox
npm run test:e2e
npm run lint:firefox
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
FIREFOX_BINARY="$(node --input-type=module -e 'import {firefox} from "@playwright/test"; console.log(firefox.executablePath())')" .venv/bin/python tests/firefox-browser.py
```

Node tests cover boundary times, invalid inputs, URL matching, block precedence, custom quotas and delays, extensions, summaries, message authorization, serialization, persistence, private-session storage and recovery. Chromium tests load the actual package and exercise redirects, hash and History API changes, dashboard reuse, private-window permission, private blocking and removal of temporary rules. Firefox's Selenium harness installs the actual ZIP temporarily and checks full routes, extensions, recovery, dashboard and private-window behavior.

The Chromium incognito test enables Developer mode and Allow in incognito only in its disposable profile. Firefox's harness uses WebDriver chrome context only to grant private-window permission in its disposable profile; production code does not have that privilege. Selenium Manager may download geckodriver on first use.

Preview tests cover form controls, optional resources, custom policy, time extensions, reloads, intercepted destinations, grants, completion, delayed exit, recovery, dashboard navigation, malformed storage, narrow layout and enlarged text. WebMCP is tested with a stub; native protocol interoperability is not established.

Before public release, test target stable browsers on Windows and macOS, sleep/wake, full browser restart, real authentication redirects, conflicting extensions and assistive technology. Edge/Brave/Opera compatibility uses the Chromium package but is not individually certified. Safari needs a separate build. CI is supplied, but has not run on a remote repository.
