# Release notes

## 0.2.1

This release fixes hostname and frame-control boundaries, improves failure recovery and accessibility, and adds guided downloads with reproducible browser packages.

- Closes trailing-dot hostname bypasses and rejects framed session control.
- Validates saved state before applying rules and reduces destination-fragment exposure.
- Restricts Firefox private-session starts to prevent effects on normal windows.
- Adds popup retry, caught dashboard deletion errors, named timers, meaningful announcements, and blocked-rule explanations.
- Adds download, support, and privacy website pages.
- Rebuilds release directories from a clean destination so removed files cannot
  remain in a package.
- Emits versioned archives alongside the existing stable download aliases.
- Normalizes ZIP metadata so the same inputs produce byte-identical archives.
- Writes `public/SHA256SUMS` and `public/release-manifest.json` for release
  verification.
- Keeps Chrome/Edge/Opera on the Chromium package and Firefox on its own
  package. Safari remains a separate packaging and signing project.

Store publication, signing, publisher identity, support contact, hosted
privacy-policy URL, platform certification, and store approval remain manual
release gates. The package does not include fabricated store screenshots or
claim Safari support.
