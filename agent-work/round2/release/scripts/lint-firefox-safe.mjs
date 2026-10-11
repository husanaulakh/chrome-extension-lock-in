import { spawn } from 'node:child_process';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.LOCK_IN_ROOT || path.resolve(scriptDir, '..'));
const dependencyRoot = process.env.LOCK_IN_DEPS_ROOT || root;
const source = path.resolve(process.env.LOCK_IN_FIREFOX_SOURCE || path.join(root, 'releases/firefox'));
const maxInputBytes = 10 * 1024 * 1024;
const maxPngDimension = 4096;
const blockedFormats = new Set(['.icns', '.jxl', '.heif', '.heic', '.avif']);
const allowedImageExtensions = new Set(['.png', '.svg']);
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.txt', '.mjs', '.map', '.xml']);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const info = await lstat(fullPath);
    if (info.isSymbolicLink()) throw new Error(`symlink rejected in Firefox lint input: ${fullPath}`);
    if (info.isDirectory()) files.push(...await walk(fullPath));
    else if (info.isFile()) files.push(fullPath);
  }
  return files;
}

function isJxl(bytes) {
  return bytes.subarray(0, 2).equals(Buffer.from([0xff, 0x0a])) || bytes.subarray(4, 8).toString() === 'JXL ';
}

function isHeif(bytes) {
  if (bytes.subarray(4, 8).toString() !== 'ftyp') return false;
  const brands = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']);
  for (let offset = 8; offset + 4 <= Math.min(bytes.length, 128); offset += 4)
    if (brands.has(bytes.subarray(offset, offset + 4).toString('ascii'))) return true;
  return false;
}

function isIcns(bytes) {
  return bytes.subarray(0, 4).toString() === 'icns';
}

function inspectPng(bytes, file) {
  if (!bytes.subarray(0, pngSignature.length).equals(pngSignature))
    throw new Error(`invalid PNG signature: ${file}`);
  let offset = pngSignature.length;
  let chunks = 0;
  let sawHeader = false;
  let sawEnd = false;
  while (offset + 12 <= bytes.length && chunks++ < 10000) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error(`truncated PNG chunk in ${file}`);
    if (type === 'IHDR') {
      if (length !== 13 || sawHeader) throw new Error(`invalid PNG header in ${file}`);
      const width = bytes.readUInt32BE(offset + 8);
      const height = bytes.readUInt32BE(offset + 12);
      if (!width || !height || width > maxPngDimension || height > maxPngDimension)
        throw new Error(`PNG dimensions exceed safe bounds in ${file}`);
      sawHeader = true;
    }
    if (type === 'IEND') {
      if (length !== 0) throw new Error(`invalid PNG end chunk in ${file}`);
      sawEnd = true;
      break;
    }
    offset = end;
  }
  if (!sawHeader || !sawEnd) throw new Error(`PNG must contain bounded IHDR and IEND chunks: ${file}`);
}

const files = await walk(source);
const manifestPath = path.join(source, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestIcons = Object.values(manifest.icons || {});
if (!manifestIcons.length || manifestIcons.some((icon) => path.extname(icon).toLowerCase() !== '.png'))
  throw new Error('Firefox manifest icons must be generated PNG files');
const iconPaths = new Set(manifestIcons.map((icon) => path.resolve(source, icon)));

for (const file of files) {
  const info = await stat(file);
  if (info.size > maxInputBytes) throw new Error(`lint input exceeds ${maxInputBytes} bytes: ${file}`);
  const extension = path.extname(file).toLowerCase();
  const bytes = await readFile(file);
  if (blockedFormats.has(extension) || isIcns(bytes) || isJxl(bytes) || isHeif(bytes))
    throw new Error(`untrusted image format rejected before web-ext: ${file}`);
  if (extension === '.png' || iconPaths.has(file)) inspectPng(bytes, file);
  if (iconPaths.has(file) && !allowedImageExtensions.has(extension))
    throw new Error(`manifest icon is not a PNG: ${file}`);
  if (extension === '.svg') {
    const text = bytes.toString('utf8');
    if (/<\s*(?:script|foreignObject)\b/i.test(text) || /(?:href|src)\s*=\s*["']https?:/i.test(text))
      throw new Error(`external or executable SVG rejected before web-ext: ${file}`);
  }
  if (extension && !allowedImageExtensions.has(extension) && !textExtensions.has(extension) && !iconPaths.has(file))
    throw new Error(`unknown binary input rejected before web-ext: ${file}`);
}

if (process.argv.includes('--check-only')) {
  console.log(`Checked ${files.length} Firefox lint inputs; only bounded local assets accepted.`);
  process.exit(0);
}

const webExt = path.join(dependencyRoot, 'node_modules/web-ext/bin/web-ext.js');
const child = spawn(process.execPath, [webExt, 'lint', '--source-dir', source], { stdio: 'inherit' });
const timeout = setTimeout(() => {
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 5000).unref();
}, 120_000);
child.on('exit', (code, signal) => {
  clearTimeout(timeout);
  process.exitCode = signal ? 1 : (code ?? 1);
});
