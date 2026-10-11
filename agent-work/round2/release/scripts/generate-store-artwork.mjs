import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const root = path.resolve(
  process.env.LOCK_IN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const dependencyRoot = process.env.LOCK_IN_DEPS_ROOT || root;
const sharp = require(
  require.resolve('sharp', { paths: [require.resolve('wrangler', { paths: [dependencyRoot] })] }),
);
const output = path.resolve(root, 'store-assets');
const brand = path.resolve(root, 'public/icon.svg');
const provenance = path.resolve(root, 'provenance/store-artwork.json');

const artwork = (width, height) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#121826"/>
      <stop offset="0.58" stop-color="#1f2937"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#93c5fd" stop-opacity=".9"/>
      <stop offset="1" stop-color="#a7f3d0" stop-opacity=".15"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${Math.round(width * .16)}" cy="${Math.round(height * .12)}" r="${Math.round(Math.min(width,height) * .32)}" fill="#2563eb" opacity=".18" filter="url(#glow)"/>
  <circle cx="${Math.round(width * .84)}" cy="${Math.round(height * .8)}" r="${Math.round(Math.min(width,height) * .38)}" fill="#059669" opacity=".15" filter="url(#glow)"/>
  <rect x="${Math.round(width * .08)}" y="${Math.round(height * .15)}" width="${Math.round(width * .84)}" height="${Math.round(height * .7)}" rx="${Math.round(height * .12)}" fill="#111827" opacity=".55" stroke="#64748b" stroke-opacity=".38"/>
  <path d="M ${Math.round(width*.14)} ${Math.round(height*.68)} C ${Math.round(width*.32)} ${Math.round(height*.44)}, ${Math.round(width*.38)} ${Math.round(height*.74)}, ${Math.round(width*.52)} ${Math.round(height*.48)} S ${Math.round(width*.73)} ${Math.round(height*.34)}, ${Math.round(width*.86)} ${Math.round(height*.58)}" fill="none" stroke="url(#line)" stroke-width="${Math.max(4, Math.round(height*.018))}" stroke-linecap="round"/>
  <circle cx="${Math.round(width*.52)}" cy="${Math.round(height*.48)}" r="${Math.max(7, Math.round(height*.04))}" fill="#d1fae5"/>
  <circle cx="${Math.round(width*.52)}" cy="${Math.round(height*.48)}" r="${Math.max(16, Math.round(height*.1))}" fill="none" stroke="#a7f3d0" stroke-opacity=".25" stroke-width="3"/>
  <rect x="${Math.round(width*.14)}" y="${Math.round(height*.22)}" width="${Math.round(width*.18)}" height="${Math.max(5, Math.round(height*.02))}" rx="4" fill="#e2e8f0" opacity=".78"/>
  <rect x="${Math.round(width*.14)}" y="${Math.round(height*.29)}" width="${Math.round(width*.11)}" height="${Math.max(4, Math.round(height*.014))}" rx="3" fill="#94a3b8" opacity=".66"/>
  <rect x="${Math.round(width*.7)}" y="${Math.round(height*.68)}" width="${Math.round(width*.16)}" height="${Math.max(5, Math.round(height*.02))}" rx="4" fill="#a7f3d0" opacity=".82"/>
</svg>`;

await mkdir(output, { recursive: true });
const svg = await readFile(brand);
const files = [
  ['chrome-small-promotional-440x280.png', 440, 280],
  ['chrome-marquee-1400x560.png', 1400, 560],
  ['edge-small-promotional-440x280.png', 440, 280],
  ['edge-large-promotional-1400x560.png', 1400, 560],
];

for (const [name, width, height] of files) {
  const iconSize = Math.round(Math.min(220, Math.max(116, height * 0.34)));
  const tile = await sharp(Buffer.from(artwork(width, height)))
    .composite([{ input: await sharp(svg).resize(iconSize, iconSize).png().toBuffer(), left: Math.round(width * .5 - iconSize / 2), top: Math.round(height * .5 - iconSize / 2) }])
    .png()
    .toFile(path.join(output, name));
  if (tile.width !== width || tile.height !== height) throw new Error(`Unexpected dimensions for ${name}`);
}

await writeFile(provenance, `${JSON.stringify({
  generatedBy: 'scripts/generate-store-artwork.mjs',
  sourceBrand: 'public/icon.svg',
  inputs: ['public/icon.svg'],
  outputs: files.map(([file, width, height]) => ({ file: `store-assets/${file}`, width, height })),
  description: 'Deterministic abstract brand artwork with a lock mark and focus boundary motif. These are promotional tiles, not extension UI screenshots and do not claim browser execution.',
  storeApproval: false,
}, null, 2)}\n`);

console.log(`Generated ${files.length} deterministic promotional assets in ${output}`);
