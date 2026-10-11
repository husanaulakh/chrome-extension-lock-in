import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LockKeyhole } from 'lucide-react';
const require = createRequire(import.meta.url);
// Reuse the renderer already installed with the build toolchain.
const sharp = require(
  require.resolve('sharp', { paths: [require.resolve('wrangler')] }),
);
await copyFile('core/engine.mjs', 'extension/engine.mjs');
await copyFile('LICENSE', 'extension/LICENSE');
await mkdir('extension/icons', { recursive: true });
const icon = renderToStaticMarkup(
  React.createElement(LockKeyhole, {
    width: 62,
    height: 62,
    color: 'white',
    strokeWidth: 1.6,
  }),
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="30" fill="#23634d"/><g transform="translate(33 30)">${icon}</g></svg>`;
for (const size of [16, 32, 48, 96, 128])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`extension/icons/icon-${size}.png`);
await writeFile('public/icon.svg', svg);
await mkdir('public/docs', { recursive: true });
for (const file of [
  'README.md',
  'EXTENSION.md',
  'BUSINESS.md',
  'ARCHITECTURE.md',
  'TESTING.md',
  'VALIDATION.md',
  'PRIVACY.md',
  'STORE-SUBMISSION.md',
  'RELEASE-NOTES.md',
  'store-metadata.template.json',
]) {
  await copyFile(
    file === 'README.md' ? file : `docs/${file}`,
    `public/docs/${file}`,
  );
}
const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
const version = manifest.version;
const archivePython = `
import pathlib
import sys
import zipfile

root = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
with zipfile.ZipFile(
    target,
    'w',
    compression=zipfile.ZIP_DEFLATED,
    compresslevel=9,
) as archive:
    for path in sorted(p for p in root.rglob('*') if p.is_file()):
        info = zipfile.ZipInfo(
            path.relative_to(root).as_posix(),
            date_time=(1980, 1, 1, 0, 0, 0),
        )
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
`;
const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

for (const browser of ['chromium', 'firefox']) {
  const dest = `releases/${browser}`;
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp('extension', dest, { recursive: true });
  const configured = structuredClone(manifest);
  if (browser === 'firefox') {
    configured.background = { scripts: ['background.mjs'], type: 'module' };
    configured.incognito = 'spanning';
    delete configured.minimum_chrome_version;
    configured.browser_specific_settings = {
      gecko: {
        id: 'lock-in@focus.invalid',
        strict_min_version: '142.0',
        data_collection_permissions: { required: ['none'] },
      },
    };
  }
  await writeFile(
    `${dest}/manifest.json`,
    JSON.stringify(configured, null, 2) + '\n',
  );
  const versionedArchive = `public/lock-in-${browser}-v${version}.zip`;
  execFileSync('python3', ['-c', archivePython, dest, versionedArchive]);
  await copyFile(versionedArchive, `public/lock-in-${browser}.zip`);
  if (browser === 'chromium')
    await copyFile(versionedArchive, 'public/lock-in-extension.zip');
}

const archiveNames = [
  `lock-in-chromium-v${version}.zip`,
  `lock-in-firefox-v${version}.zip`,
  'lock-in-chromium.zip',
  'lock-in-firefox.zip',
  'lock-in-extension.zip',
];
const archiveHashes = Object.fromEntries(
  await Promise.all(
    archiveNames.map(async (name) => [name, await sha256(`public/${name}`)]),
  ),
);
await writeFile(
  'public/SHA256SUMS',
  archiveNames.map((name) => `${archiveHashes[name]}  ${name}`).join('\n') +
    '\n',
);
await writeFile(
  'public/release-manifest.json',
  JSON.stringify(
    {
      name: manifest.name,
      version,
      archives: archiveNames.map((name) => ({
        file: name,
        sha256: archiveHashes[name],
      })),
      browsers: {
        chromium: {
          manifest: 'releases/chromium/manifest.json',
          versionedArchive: `lock-in-chromium-v${version}.zip`,
          stableAlias: 'lock-in-chromium.zip',
        },
        firefox: {
          manifest: 'releases/firefox/manifest.json',
          versionedArchive: `lock-in-firefox-v${version}.zip`,
          stableAlias: 'lock-in-firefox.zip',
        },
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Packaged Chromium and Firefox extensions at version ${version}; wrote checksums and release metadata.`,
);
