# Release notes

## 0.2.1

This release tightens browser package delivery for the Chromium and Firefox
builds.

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
