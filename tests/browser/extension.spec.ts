import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
test('unpacked extension enforces real navigation and recovery removes rules', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'lock-in-browser-'));
  const extension = path.resolve('releases/chromium');
  const fixture = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><h1>Recovered fixture</h1>');
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  const address = fixture.address();
  if (!address || typeof address === 'string') throw Error('Fixture did not bind');
  const blockedURL = `http://127.0.0.1:${address.port}/`;
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/index.html`);
    await page
      .getByLabel('What are you working on?')
      .fill('Read the local guide');
    await page.getByLabel('Focus website').fill('localhost');
    await page.getByLabel('Minutes', { exact: true }).fill('1');
    await page.getByLabel('Commitment').selectOption('locked');
    await page.getByRole('button', { name: 'Lock in' }).click();
    await expect(page.locator('#active')).toBeVisible();
    await expect(page.locator('#feedback')).toHaveText('');
    const target = await context.newPage();
    await target.goto(blockedURL).catch(() => {});
    await expect(target).toHaveURL(
      new RegExp(`chrome-extension://${id}/blocked.html`),
    );
    await expect(
      target.getByRole('heading', { name: 'Not right now.' }),
    ).toBeVisible();
    await expect(target.locator('#no-access')).toBeVisible();
    await page.getByText('Need to leave?', { exact: true }).click();
    await page.getByText('Technical recovery', { exact: true }).click();
    await page.getByRole('button', { name: 'End through recovery' }).click();
    await expect(page.locator('#setup')).toBeVisible();
    await target.goto(blockedURL);
    await expect(target).toHaveURL(blockedURL);
    await expect(target.getByRole('heading', { name: 'Recovered fixture' })).toBeVisible();
  } finally {
    await context.close();
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    await rm(profile, { recursive: true, force: true });
  }
});
