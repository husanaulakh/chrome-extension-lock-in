import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve('sharp', { paths: [require.resolve('wrangler')] }),
);
const root = process.cwd();
const extension = path.resolve(root, 'releases/chromium');
const output = path.resolve(root, 'store-assets');
const iconSvg = path.resolve(root, 'public/icon.svg');

const fixtureHtml = `<!doctype html><title>Exam fixture</title>
<h1>Practice exam</h1>
<button id="hash" onclick="location.hash='exams/take_driver/9001'">Other exam</button>
<button id="history" onclick="history.pushState({}, '', '/other')">Other page</button>`;

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end(fixtureHtml);
});

const listen = () =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

const waitForDashboard = async (context, id) => {
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
  await dashboard.locator('#outcomes').waitFor();
  return dashboard;
};

const capture = async (page, width, height, filename) => {
  await page.setViewportSize({ width, height });
  await page.screenshot({
    path: path.join(output, filename),
    fullPage: false,
  });
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const port = await listen();
const profile = await mkdtemp(path.join(os.tmpdir(), 'lock-in-store-assets-'));
let context;

try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  await page.locator('#incognito-status').waitFor({ state: 'visible' });

  const allowed = `http://127.0.0.1:${port}/exam#exams/take_driver/9000`;
  await page.locator('[name=task]').fill('Prepare for the next exam');
  await page.locator('[name=focus]').fill(allowed);
  await page.locator('[name=scope]').selectOption('exact');
  await page.locator('[name=level]').selectOption('locked');
  await capture(page, 1280, 800, 'extension-setup-1280x800.png');
  // Compact real-extension capture for the website hero. Re-run after any UI integration;
  // this is intentionally not a crop of the website preview.
  await capture(page, 520, 660, 'extension-web-preview.png');

  await page.getByRole('button', { name: /^Lock in/ }).click();
  await page.locator('#active').waitFor({ state: 'visible' });
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByText('Technical recovery', { exact: true }).click();
  await page.getByRole('button', { name: 'End through recovery' }).click();
  await page.locator('#setup').waitFor({ state: 'visible' });
  const dashboard = await waitForDashboard(context, id);

  await capture(dashboard, 1280, 800, 'extension-dashboard-1280x800.png');
  await capture(page, 612, 408, 'extension-setup-opera-612x408.png');
  await capture(dashboard, 612, 408, 'extension-dashboard-opera-612x408.png');

  const svg = await readFile(iconSvg);
  for (const size of [128, 300])
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(output, `icon-${size}.png`));

  await writeFile(
    path.join(output, 'manifest.json'),
    JSON.stringify(
      {
        source: 'actual packaged Chromium extension',
        fixture: 'local HTTP fixture; no website simulation or remote content',
        captures: [
          { file: 'extension-setup-1280x800.png', width: 1280, height: 800 },
          { file: 'extension-web-preview.png', width: 520, height: 660 },
          {
            file: 'extension-dashboard-1280x800.png',
            width: 1280,
            height: 800,
          },
          {
            file: 'extension-setup-opera-612x408.png',
            width: 612,
            height: 408,
          },
          {
            file: 'extension-dashboard-opera-612x408.png',
            width: 612,
            height: 408,
          },
        ],
        icons: [
          { file: 'icon-128.png', width: 128, height: 128 },
          { file: 'icon-300.png', width: 300, height: 300 },
        ],
        storeApproval: false,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  if (context) await context.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}

console.log(`Captured actual extension store assets in ${output}`);
