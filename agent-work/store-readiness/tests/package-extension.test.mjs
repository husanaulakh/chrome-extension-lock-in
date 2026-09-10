import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (name) =>
  JSON.parse(await readFile(path.join(root, name), 'utf8'));
const hash = async (name) =>
  createHash('sha256')
    .update(await readFile(path.join(root, name)))
    .digest('hex');
const exists = async (name) =>
  access(path.join(root, name)).then(
    () => true,
    () => false,
  );

test('extension packaging cleans, reproduces, and describes release artifacts', async () => {
  const chromiumRelease = path.join(root, 'releases/chromium');
  const firefoxRelease = path.join(root, 'releases/firefox');
  await mkdir(chromiumRelease, { recursive: true });
  await mkdir(firefoxRelease, { recursive: true });
  await writeFile(path.join(chromiumRelease, 'stale-sentinel.tmp'), 'stale');
  await writeFile(path.join(firefoxRelease, 'stale-sentinel.tmp'), 'stale');

  const runPackage = () =>
    execFile(process.execPath, ['scripts/package-extension.mjs'], {
      cwd: root,
    });
  await runPackage();

  assert.equal(await exists('releases/chromium/stale-sentinel.tmp'), false);
  assert.equal(await exists('releases/firefox/stale-sentinel.tmp'), false);

  const sourceManifest = await readJson('extension/manifest.json');
  const version = sourceManifest.version;
  const archiveNames = [
    `public/lock-in-chromium-v${version}.zip`,
    `public/lock-in-firefox-v${version}.zip`,
    'public/lock-in-chromium.zip',
    'public/lock-in-firefox.zip',
    'public/lock-in-extension.zip',
  ];
  for (const archive of archiveNames) assert.equal(await exists(archive), true);

  const firstHashes = Object.fromEntries(
    await Promise.all(
      archiveNames.map(async (name) => [name, await hash(name)]),
    ),
  );
  assert.equal(
    firstHashes['public/lock-in-chromium.zip'],
    firstHashes[archiveNames[0]],
  );
  assert.equal(
    firstHashes['public/lock-in-extension.zip'],
    firstHashes[archiveNames[0]],
  );
  assert.equal(
    firstHashes['public/lock-in-firefox.zip'],
    firstHashes[archiveNames[1]],
  );

  const sums = Object.fromEntries(
    (await readFile(path.join(root, 'public/SHA256SUMS'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => {
        const [digest, file] = line.split(/ {2}/);
        return [file, digest];
      }),
  );
  for (const archive of archiveNames) {
    const relative = archive.slice('public/'.length);
    assert.equal(sums[relative], firstHashes[archive]);
  }

  const release = await readJson('public/release-manifest.json');
  assert.equal(release.name, sourceManifest.name);
  assert.equal(release.version, version);
  assert.deepEqual(
    release.archives,
    archiveNames.map((archive) => ({
      file: archive.slice('public/'.length),
      sha256: firstHashes[archive],
    })),
  );

  const chromiumManifest = await readJson('releases/chromium/manifest.json');
  const firefoxManifest = await readJson('releases/firefox/manifest.json');
  assert.equal(chromiumManifest.manifest_version, 3);
  assert.equal(chromiumManifest.background.service_worker, 'background.mjs');
  assert.equal(firefoxManifest.manifest_version, 3);
  assert.deepEqual(firefoxManifest.background.scripts, ['background.mjs']);
  assert.equal(
    firefoxManifest.browser_specific_settings.gecko.id,
    'lock-in@focus.invalid',
  );

  const zipCheck = await execFile('python3', [
    '-c',
    "import json,sys,zipfile; result={};\nfor name in sys.argv[1:]:\n with zipfile.ZipFile(name) as z: result[name]={'hasManifest':'manifest.json' in z.namelist(),'hasSentinel':any(p.endswith('stale-sentinel.tmp') for p in z.namelist())};\nprint(json.dumps(result))",
    ...archiveNames.map((name) => path.join(root, name)),
  ]);
  const zipResults = JSON.parse(zipCheck.stdout);
  for (const archive of archiveNames) {
    assert.equal(zipResults[path.join(root, archive)].hasManifest, true);
    assert.equal(zipResults[path.join(root, archive)].hasSentinel, false);
  }

  await runPackage();
  for (const archive of archiveNames)
    assert.equal(await hash(archive), firstHashes[archive]);
});
