# Store readiness handoff

`scripts/capture-store-assets.mjs` captures genuine screenshots from the
packaged Chromium extension against a local fixture. It writes only to the
calling project’s `artifacts/store-listing/` directory.

Run it from the extension project after packaging:

```sh
node scripts/capture-store-assets.mjs
```

It emits 1280×800 Chrome/Edge candidates, 612×408 Opera candidates, and
128px/300px PNG icons rendered from the existing product SVG. It does not make
promotional tiles, claim store approval, or use the website preview.
