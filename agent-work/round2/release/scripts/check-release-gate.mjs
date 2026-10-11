import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.LOCK_IN_ROOT || path.resolve(scriptDir, '..'));
const metadataPath = path.resolve(process.env.LOCK_IN_METADATA || path.join(root, 'docs/store-metadata.template.json'));
const packagePath = path.resolve(process.env.LOCK_IN_PACKAGE || path.join(root, 'package.json'));
const lockPath = path.resolve(process.env.LOCK_IN_LOCK || path.join(root, 'package-lock.json'));
const manifestPath = path.resolve(process.env.LOCK_IN_EXTENSION_MANIFEST || path.join(root, 'extension/manifest.json'));
const dependencyRoot = process.env.LOCK_IN_DEPS_ROOT || root;

const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const lockJson = JSON.parse(await readFile(lockPath, 'utf8'));
const errors = [];
const externalGates = [];
const resolved = (relative) => path.resolve(root, relative);
const exists = async (relative) => {
  try {
    await stat(resolved(relative));
    return true;
  } catch {
    return false;
  }
};

if (metadata.product.version !== packageJson.version)
  errors.push(`metadata version ${metadata.product.version} does not match package ${packageJson.version}`);
let extensionManifest;
try {
  extensionManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (extensionManifest.version !== packageJson.version)
    errors.push(`extension version ${extensionManifest.version} does not match package ${packageJson.version}`);
} catch {
  errors.push(`missing extension manifest: ${manifestPath}`);
}

const localArtifacts = [
  metadata.assets.icon128,
  metadata.assets.icon300,
  ...metadata.assets.screenshots,
  ...metadata.assets.operaScreenshots,
  metadata.assets.smallPromotionalTile,
  metadata.assets.largePromotionalTile,
  metadata.release.checksums,
  metadata.release.manifest,
  metadata.release.releaseNotes,
];
for (const artifact of localArtifacts) {
  if (!artifact || !(await exists(artifact))) errors.push(`missing local artifact: ${artifact || '(blank path)'}`);
}
for (const target of Object.values(metadata.browserTargets)) {
  if (target.archive && !(await exists(target.archive))) errors.push(`missing archive: ${target.archive}`);
}

const sharp = require(
  require.resolve('sharp', { paths: [require.resolve('wrangler', { paths: [dependencyRoot] })] }),
);
const expectedDimensions = {
  [metadata.assets.icon128]: [128, 128],
  [metadata.assets.icon300]: [300, 300],
  [metadata.assets.smallPromotionalTile]: [440, 280],
  [metadata.assets.largePromotionalTile]: [1400, 560],
  ...Object.fromEntries(metadata.assets.screenshots.map((p) => [p, [1280, 800]])),
  ...Object.fromEntries(metadata.assets.operaScreenshots.map((p) => [p, [612, 408]])),
};
for (const [artifact, [width, height]] of Object.entries(expectedDimensions)) {
  if (!artifact || !(await exists(artifact))) continue;
  try {
    const actual = await sharp(resolved(artifact)).metadata();
    if (actual.width !== width || actual.height !== height)
      errors.push(`${artifact} is ${actual.width}x${actual.height}; expected ${width}x${height}`);
  } catch (error) {
    errors.push(`cannot inspect ${artifact}: ${error.message}`);
  }
}

const publisherFields = ['name', 'supportEmail', 'supportUrl', 'privacyPolicyUrl'];
for (const field of publisherFields)
  if (!metadata.publisher[field]) externalGates.push(`publisher.${field} is required before submission`);
if (!metadata.browserTargets.firefox.geckoId) externalGates.push('Firefox publisher-owned Gecko ID is required before submission');
if (!metadata.browserTargets.firefox.signed) externalGates.push('Firefox signed AMO artifact is required before submission');
if (!metadata.release.ownerSignoff) externalGates.push('owner sign-off is required before submission');
for (const [browser, target] of Object.entries(metadata.browserTargets)) {
  if (!target.storeListingUrl) externalGates.push(`${browser} store listing URL is not supplied`);
  if (target.approved !== true) externalGates.push(`${browser} store approval is not recorded`);
}
externalGates.push('Safari requires a separate Apple wrapper, signing, and browser validation');

const lockPackages = lockJson.packages || {};
const admZipVersion = lockPackages['node_modules/adm-zip']?.version;
const versionParts = (version) => (version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
const atLeast = (version, minimum) => {
  const actual = versionParts(version);
  const expected = versionParts(minimum);
  return expected.every((value, index) => (actual[index] || 0) >= value || actual.slice(0, index).some((part, i) => part > expected[i]));
};
if (!admZipVersion || !atLeast(admZipVersion, '0.6.1')) errors.push(`adm-zip must be >= 0.6.1; found ${admZipVersion || 'missing'}`);
if (lockPackages['node_modules/@openai/sites-vite-plugin']) errors.push('Sites plugin remains in package lock');
const imageSizeVersion = lockPackages['node_modules/image-size']?.version;
if (imageSizeVersion === '2.0.2') externalGates.push('image-size 2.0.2 remains an upstream web-ext development advisory; do not lint untrusted image formats');

const result = {
  localReady: errors.length === 0,
  submissionReady: errors.length === 0 && externalGates.length === 0,
  version: packageJson.version,
  checkedRoot: root,
  errors,
  externalGates,
  advisories: {
    productionAudit: 'must be verified with npm audit --omit=dev',
    admZip: { version: admZipVersion, status: atLeast(admZipVersion, '0.6.1') ? 'patched' : 'unresolved' },
    imageSize: { version: imageSizeVersion, status: imageSizeVersion === '2.0.2' ? 'upstream-development-advisory' : 'check-registry' },
  },
};
console.log(JSON.stringify(result, null, 2));
if (!result.localReady) process.exitCode = 1;
