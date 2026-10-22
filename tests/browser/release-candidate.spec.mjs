import { test, expect, chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let server, origin;
test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>Local work fixture</title><h1>Your work</h1>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://localhost:${server.address().port}`;
});
test.afterAll(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
async function launch(profile) {
  const extension = path.resolve('releases/chromium');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  await expect(page.locator('#incognito-status')).not.toBeEmpty();
  return { context, page, id };
}
async function start(page) {
  await page.locator('[name=task]').fill('Local testing');
  await page.locator('[name=focus]').fill(origin);
  await page.locator('[name=level]').selectOption('committed');
  await page.getByRole('button', { name: /^Lock in/ }).click();
  await expect(page.locator('#active')).toBeVisible();
}
test('blocked destination survives reload without leaking into the block-page URL and returns after a grant', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'lock-in-handoff-'));
  const app = await launch(profile);
  try {
    await start(app.page);
    const blocked = await app.context.newPage();
    const target = origin.replace('localhost', '127.0.0.1') + '/private-document?token=local-secret#exact-section';
    await blocked.goto(target).catch(() => {});
    await expect(blocked).toHaveURL(`chrome-extension://${app.id}/blocked.html`);
    await expect(blocked.locator('#blocked-domain')).toContainText('127.0.0.1');
    const saved = await app.page.evaluate(() => chrome.storage.local.get(null));
    expect(JSON.stringify(saved)).not.toContain('local-secret');
    await blocked.reload();
    await expect(blocked.locator('#blocked-domain')).toContainText('127.0.0.1');
    await blocked.locator('#access input').fill('Read the needed reference');
    await blocked.locator('#access-button').click();
    await expect(blocked).toHaveURL(target);
    await expect(blocked.getByRole('heading', { name: 'Your work' })).toBeVisible();
  } finally { await app.context.close(); await rm(profile, { recursive: true, force: true }); }
});
test('regular policy survives browser restart and expired sessions are finalized once', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'lock-in-restart-'));
  let app = await launch(profile);
  try {
    await start(app.page);
    const before = await app.page.evaluate(() => chrome.storage.local.get('session'));
    await app.context.close();
    app = await launch(profile);
    await expect(app.page.locator('#active')).toBeVisible();
    expect((await app.page.evaluate(() => chrome.storage.local.get('session'))).session.id).toBe(before.session.id);
    const target = await app.context.newPage();
    await target.goto(origin.replace('localhost', '127.0.0.1')).catch(() => {});
    await expect(target).toHaveURL(/blocked.html$/);
    await app.page.evaluate(async () => {
      const { session } = await chrome.storage.local.get('session');
      session.startedAt = Date.now() - 120000;
      session.endsAt = Date.now() - 1000;
      await chrome.storage.local.set({ session });
    });
    await expect(app.page.locator('#setup')).toBeVisible();
    await app.context.close();
    app = await launch(profile);
    const after = await app.page.evaluate(() => chrome.storage.local.get(['session', 'history']));
    expect(after.session).toBeNull();
    expect(after.history).toHaveLength(1);
    expect(after.history[0].status).toBe('completed');
    expect(await app.page.evaluate(() => chrome.declarativeNetRequest.getDynamicRules())).toEqual([]);
  } finally { await app.context.close(); await rm(profile, { recursive: true, force: true }); }
});
