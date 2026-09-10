# Store submission preparation

This document is the release gate for Lock in 0.2.1. It describes what is
packaged by the repository and what a publisher still has to complete in each
store. A successful local package or linter run is not store approval.

## Package outputs

Run `npm run package:extension` from the project root. The command creates clean
unpacked builds in `releases/chromium` and `releases/firefox`, then creates
versioned archives and compatibility aliases in `public/`:

| Browser target | Versioned archive | Stable alias | Build form |
| --- | --- | --- | --- |
| Chrome, Edge, compatible Chromium browsers | `lock-in-chromium-v0.2.1.zip` | `lock-in-chromium.zip` and `lock-in-extension.zip` | Chromium Manifest V3 service worker |
| Firefox | `lock-in-firefox-v0.2.1.zip` | `lock-in-firefox.zip` | Firefox Manifest V3 module background script |

The versioned names are derived from `extension/manifest.json`; replace the
example version in this table when the manifest version changes. The command
also writes `public/SHA256SUMS` and `public/release-manifest.json`. Verify a
download with:

```sh
cd public
sha256sum -c SHA256SUMS
```

The archives contain no remote executable code. ZIP timestamps and file order
are normalized, so identical inputs produce identical archive bytes. The
release directories are rebuilt from scratch on every package run.

`docs/store-metadata.template.json` is a machine-readable listing template.
Publisher name, support contact, hosted privacy URL, listing URLs, Gecko ID,
asset paths, submission state, and approval state are intentionally blank or
false until the owner supplies and signs off on them.

## Listing copy

Name: Lock in

Summary: Keep the pages your task needs. Set a focus session, manage
distractions, and review your progress.

Description: Choose a task and its allowed websites or exact pages. Block
selected domains, customize temporary access and exit delay, and add time when
needed. Review completed sessions in Dashboard. All features are available
without payment or an account. Records stay in your browser. Incognito/private
coverage requires browser permission; private attempts are excluded from
reports. Technical recovery is always available.

Single purpose: Help the user maintain a chosen browsing boundary during a
timed focus session.

The final listing must also include the limitations users need to understand:
rules apply to top-level HTTP(S) navigation; browser settings, extension
disablement, other profiles, other browsers, desktop applications, downloads,
embedded content, and privileged browser pages are outside the boundary.

## Permissions and data disclosures

| Permission or access | User-facing purpose |
| --- | --- |
| `storage` | Save regular sessions and keep private sessions in memory. |
| `alarms` | Reconcile expired sessions and temporary grants. |
| `tabs` | Inspect existing tab destinations and open the block page or dashboard. Recheck this permission before submission if host access alone is sufficient for the current URL reads. |
| `webNavigation` | Detect full URL, fragment, and History API navigation changes. |
| `declarativeNetRequest` | Redirect disallowed top-level HTTP(S) pages without reading page contents. |
| `http://*/*`, `https://*/*` host access | Apply the user-selected boundary across arbitrary websites. |

The extension stores task names, chosen focus URLs, resource rules, blocked
domains, deadlines, grants, and attempt summaries locally. It does not send
browsing records to a server and does not read page contents, cookies,
passwords, or keystrokes. Private sessions use temporary state and are not
written to regular history. The store listing and hosted privacy policy must
use the same wording.

## Chrome Web Store gate

The Chromium package is the candidate for Chrome Web Store submission. Before
uploading, the publisher must complete all of the following:

- Create or select the publisher account and support contact.
- Host the privacy policy at a stable HTTPS URL and enter that URL in the
  Developer Dashboard. The packaged `privacy.html` page is useful in-product
  but is not a substitute for the dashboard URL.
- Provide at least one actual extension screenshot at 1280×800 or 640×400.
  `artifacts/store-preview-1280x800.png` is a website preview capture and must
  not be submitted as an extension screenshot.
- Prepare the required 128×128 store icon and the dashboard promotional assets
  requested for the target listing. Do not claim effectiveness, certification,
  or support for an untested browser.
- Explain every required permission and the broad HTTP(S) host access in the
  listing. Keep the permission set to the narrowest set needed by the current
  feature set.
- Upload the versioned Chromium ZIP, verify the uploaded manifest version, and
  retain the matching checksum and release manifest.

Current official references: [Chrome Web Store listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing),
[Chrome screenshot requirements](https://developer.chrome.com/docs/webstore/images),
[Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies),
[Chrome user-data policy](https://developer.chrome.com/docs/webstore/user_data), and
[Chrome permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions).

## Microsoft Edge Add-ons gate

Edge uses the Chromium archive, but a separate Edge listing and browser test
are required. The publisher must:

- Upload the ZIP through Partner Center and complete the Edge privacy page,
  including the privacy-policy URL and data-use declarations.
- Provide a 1:1 extension logo (recommended 300×300, minimum 128×128), a
  description of at least 250 characters, and the required language metadata.
  Promotional tiles and screenshots are separate listing assets.
- Test installation, popup/dashboard flow, redirects, private browsing
  permission, browser restart, and recovery on the target Edge release.
- Submit the versioned ZIP and keep its checksum; do not describe the package
  as Edge-certified until that test is complete.

Current official references: [Edge publishing overview](https://learn.microsoft.com/en-us/microsoft-edge/extensions/),
[Edge listing fields and asset dimensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension),
[Edge hosting and ZIP distribution](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/hosting-and-updating), and
[Edge developer policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies).

## Firefox AMO gate

The Firefox archive is an MV3 package with a module background script and
`data_collection_permissions.required: ["none"]`. The publisher must:

- Replace `lock-in@focus.invalid` with a stable publisher-owned Gecko ID before
  the first public release. Do not change it as part of an automated package
  run without the owner’s decision.
- Create the AMO developer account, listing, support email, support website,
  category, license, and privacy disclosure as applicable.
- Upload the versioned Firefox ZIP, complete validator checks, and provide
  source code/build instructions or third-party library links if AMO requests
  them during review.
- Test the signed build after AMO processing. The current local ZIP is suitable
  for temporary testing but is not a permanently installable signed release.
- Record the Firefox version, operating system, private-window permission,
  restart, worker recovery, and exact-route results in the release validation
  record.

Current official references: [AMO submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/),
[Mozilla Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/),
[Firefox data-collection manifest settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings),
[Firefox background manifest support](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), and
[source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/).

## Opera Add-ons gate

Opera is Chromium-based and can use the Chromium package, but it is a separate
store target. The publisher must:

- Verify the package on the target Opera stable release, including the
  `minimum_chrome_version` constraint and all user permission prompts.
- Prepare the Opera listing, support page, category, license, icon, and
  screenshots. Opera’s publishing guide prefers 612×408 screenshots and
  requires clean captures focused on the extension.
- Submit the ZIP through the Opera extensions catalog and wait for moderator
  review. Until then, describe Opera as compatible by design and untested,
  rather than certified.

Current official references: [Opera publishing guidelines](https://help.opera.com/en/extensions/publishing-guidelines/),
[Opera acceptance criteria](https://help.opera.com/en/extensions/acceptance-criteria/), and
[Opera extension architecture](https://help.opera.com/en/extensions/architecture-overview/).

## Safari gate

Safari is not supported by the current release artifacts. A Safari release
requires a separate compatibility pass and an Apple wrapper/app target:

- Convert the WebExtension with Apple’s Safari Web Extension packager or an
  Xcode project.
- Validate Safari’s manifest/API behavior, including website access prompts,
  private browsing behavior, module background lifecycle, storage, tabs, and
  declarative network redirects. Apple documents
  `declarativeNetRequestWithHostAccess` for redirect rules in Safari.
- Test the wrapper on the intended macOS/iOS Safari targets.
- Sign and distribute the containing app through the Apple distribution path;
  the Chromium ZIP is not a Safari deliverable.

Current official references: [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions),
[Safari packaging](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari),
[Safari distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension),
[Safari website permissions](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions), and
[Safari declarative network requests](https://developer.apple.com/documentation/safariservices/blocking-content-with-your-safari-web-extension).

## Evidence and release sign-off

Before publication, attach the exact command output and artifacts for:

1. `npm run package:extension`
2. `sha256sum -c public/SHA256SUMS`
3. package regression tests for clean destinations, deterministic archives,
   archive aliases, checksums, and manifest integrity
4. unit, integration, typecheck, lint, build, Chromium, and Firefox checks
5. target-browser checks for each store listing

The owner signs off the publisher identity, support contact, hosted privacy
URL, final screenshots/tiles, store descriptions, stable Gecko ID, and the
decision to ship or defer each browser. No store link, approval, signing
status, or Safari support should be represented before that sign-off.
