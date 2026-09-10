import { test, expect, chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let server, origin;
test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      '<!doctype html><title>Exam fixture</title><h1>Practice exam</h1><button id="hash" onclick="location.hash=\'exams/take_driver/9001\'">Other exam</button><button id="history" onclick="history.pushState({},\'\',\'/other\')">Other page</button>',
    );
  });
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
  origin = `http://localhost:${server.address().port}`;
});
test.afterAll(
  () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(resolve);
    }),
);
async function launch() {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'lock-in-v2-'));
  const ext = path.resolve('releases/chromium');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  await expect(page.locator('#incognito-status')).not.toBeEmpty();
  return {
    context,
    page,
    id,
    close: async () => {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    },
  };
}
async function start(page, focus, scope = 'exact') {
  await page.locator('[name=task]').fill('Practice exam');
  await page.locator('[name=focus]').fill(focus);
  await page.locator('[name=scope]').selectOption(scope);
  await page.locator('[name=level]').selectOption('locked');
  await page.getByRole('button', { name: /^Lock in/ }).click();
  await expect(page.locator('#active')).toBeVisible();
  await expect(page.locator('#feedback')).toHaveText('');
}
async function recover(page) {
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByText('Technical recovery', { exact: true }).click();
  await page.getByRole('button', { name: 'End through recovery' }).click();
  await expect(page.locator('#setup')).toBeVisible();
}
test('exact URL guards hash and History API changes, persists extension, and opens one dashboard', async () => {
  const app = await launch();
  try {
    const allowed = origin + '/exam#exams/take_driver/9000';
    await start(app.page, allowed);
    await app.page.getByLabel('Minutes to add').fill('17');
    await app.page
      .getByRole('button', { name: 'Add time', exact: true })
      .click();
    await expect(app.page.locator('#feedback')).toHaveText('Added 17 minutes.');
    await app.page.reload();
    await expect(app.page.locator('#timer')).toContainText('42:');
    const target = await app.context.newPage();
    await target.goto(allowed).catch(() => {});
    await expect(target.locator('#hash')).toBeVisible();
    await target.locator('#hash').click();
    await expect(target).toHaveURL(/blocked.html/);
    await target.goto(allowed);
    await target.locator('#history').click();
    await expect(target).toHaveURL(/blocked.html/);
    await recover(app.page);
    await app.page.locator('[name=task]').fill('Changed');
    await app.page
      .getByRole('button', { name: 'Use last setup', exact: true })
      .click();
    await expect(app.page.locator('[name=task]')).toHaveValue('Practice exam');
    await expect(app.page.locator('#start [name=minutes]')).toHaveValue('25');
    await expect(app.page.locator('[name=scope]')).toHaveValue('exact');
    await expect(app.page.locator('#active')).toBeHidden();
    await app.page.screenshot({
      path: 'artifacts/extension-setup.png',
      fullPage: true,
    });
    await app.page.getByRole('button', { name: 'Dashboard' }).click();
    await expect
      .poll(
        () =>
          app.context.pages().filter((p) => p.url().endsWith('/dashboard.html'))
            .length,
      )
      .toBe(1);
    await app.page.getByRole('button', { name: 'Dashboard' }).click();
    expect(
      app.context.pages().filter((p) => p.url().endsWith('/dashboard.html'))
        .length,
    ).toBe(1);
    const dashboard = app.context
      .pages()
      .find((p) => p.url().endsWith('/dashboard.html'));
    await expect(dashboard.locator('#outcomes')).toContainText('1 recoveries');
    await dashboard.screenshot({
      path: 'artifacts/extension-dashboard.png',
      fullPage: true,
    });
  } finally {
    await app.close();
  }
});
test('selected domain block redirects only matching hostnames', async () => {
  const app = await launch();
  try {
    await app.page.getByRole('button', { name: /More resources/ }).click();
    await app.page.locator('[name=mode]').selectOption('block');
    await app.page.locator('[name=blocked]').fill('127.0.0.1');
    await start(app.page, origin, 'domain');
    const target = await app.context.newPage();
    await target.goto(origin).catch(() => {});
    await expect(
      target.getByRole('heading', { name: 'Practice exam' }),
    ).toBeVisible();
    await target.goto(origin.replace('localhost', '127.0.0.1')).catch(() => {});
    await expect(target).toHaveURL(/blocked.html/);
  } finally {
    await app.close();
  }
});
test('incognito extension applies rules without persisting private sessions', async () => {
  const app = await launch();
  try {
    await expect(app.page.locator('#incognito-status')).toContainText('off');
    const settings = await app.context.newPage();
    await settings.goto('chrome://extensions');
    await settings.evaluate(() =>
      chrome.developerPrivate.updateProfileConfiguration({
        inDeveloperMode: true,
      }),
    );
    await settings.evaluate(async (id) => {
      await new Promise((resolve, reject) => {
        globalThis.chrome.developerPrivate.updateExtensionConfiguration(
          { extensionId: id, incognitoAccess: true },
          () => {
            const e = globalThis.chrome.runtime.lastError;
            if (e) reject(Error(e.message));
            else resolve();
          },
        );
      });
    }, app.id);
    app.page = await app.context.newPage();
    await expect(async () => {
      await app.page.goto(`chrome-extension://${app.id}/index.html`);
      await expect(app.page.locator('#incognito-status')).toContainText(
        'enabled',
      );
    }).toPass({ timeout: 15000 });
    await expect(app.page.locator('#incognito-status')).toContainText(
      'enabled',
    );
    const privatePageEvent = app.context.waitForEvent('page');
    await app.page.evaluate(
      (url) => globalThis.chrome.windows.create({ incognito: true, url }),
      `chrome-extension://${app.id}/index.html`,
    );
    const privatePage = await privatePageEvent;
    await privatePage.waitForLoadState();
    await expect(privatePage.locator('#privacy-session-note')).toBeVisible();
    await start(privatePage, origin + '/exam#exams/take_driver/9000');
    const persistent = await privatePage.evaluate(() =>
      globalThis.chrome.storage.local.get(null),
    );
    expect(persistent.session).toBeFalsy();
    expect(persistent.history ?? []).toEqual([]);
    const url = origin.replace('localhost', '127.0.0.1');
    await privatePage.evaluate(
      (url) => globalThis.chrome.tabs.create({ url }),
      url,
    );
    await expect
      .poll(
        () =>
          app.context.pages().filter((p) => p.url().includes('/blocked.html'))
            .length,
      )
      .toBeGreaterThan(0);
    const blocked = app.context
      .pages()
      .find((p) => p.url().includes('/blocked.html'));
    await expect(
      blocked.getByRole('heading', { name: 'Not right now.' }),
    ).toBeVisible();
    await recover(privatePage);
    const after = await privatePage.evaluate(() =>
      globalThis.chrome.storage.local.get(null),
    );
    expect(after.history ?? []).toEqual([]);
    expect(
      await privatePage.evaluate(() =>
        globalThis.chrome.declarativeNetRequest.getSessionRules(),
      ),
    ).toEqual([]);
  } finally {
    await app.close();
  }
});

test('native setup check shares exact rules and creates no session or DNR rules', async () => {
  const app = await launch();
  try {
    await app.page.locator('[name=focus]').fill(origin + '/exam#9000');
    await app.page.locator('[name=scope]').selectOption('exact');
    await app.page.getByRole('button', { name: /More resources/ }).click();
    await app.page
      .getByLabel('Will this page be allowed?')
      .fill(origin + '/exam#9001');
    await app.page
      .getByRole('button', { name: 'Check URL', exact: true })
      .click();
    await expect(app.page.locator('#rule-result')).toHaveText(
      'Blocked by these rules.',
    );
    await app.page.locator('[name=resources]').fill(origin + '/exam#9001');
    await expect(app.page.locator('#rule-result')).toHaveText(
      'Allowed by these rules.',
    );
    const stored = await app.page.evaluate(() =>
      chrome.storage.local.get(null),
    );
    expect(stored.session).toBeFalsy();
    expect(stored.history ?? []).toEqual([]);
    expect(
      await app.page.evaluate(() =>
        chrome.declarativeNetRequest.getDynamicRules(),
      ),
    ).toEqual([]);
    await start(app.page, origin + '/exam#9000');
    await expect(app.page).toHaveTitle(/\d+:\d{2} — Lock in/);
    await recover(app.page);
    await expect(app.page).toHaveTitle('Lock in');
  } finally {
    await app.close();
  }
});

test('accessible session state, retry, and framing protection survive worker failures', async () => {
  const app = await launch();
  try {
    await app.page.evaluate(() => {
      const original = chrome.runtime.sendMessage.bind(chrome.runtime);
      window.restoreMessaging = () => {
        chrome.runtime.sendMessage = original;
      };
      chrome.runtime.sendMessage = async () => {
        throw Error(
          'Could not establish connection. Receiving end does not exist.',
        );
      };
    });
    await app.page.locator('#dashboard').click();
    await expect(app.page.locator('#retry')).toBeVisible();
    await app.page.evaluate(() => window.restoreMessaging());
    await app.page.locator('#retry').click();
    await expect(app.page.locator('#feedback')).toHaveText(
      'Connection restored.',
    );
    await start(app.page, origin, 'domain');
    await expect(
      app.page.getByRole('heading', { level: 1, name: 'Practice exam' }),
    ).toBeVisible();
    await expect(
      app.page.getByRole('timer', { name: 'Time remaining' }),
    ).toBeVisible();
    await expect(app.page.locator('#live-status')).toContainText(
      'Focus session active',
    );
    const host = await app.context.newPage();
    await host.goto(origin);
    await host.evaluate((id) => {
      const frame = document.createElement('iframe');
      frame.src = `chrome-extension://${id}/blocked.html#https://example.com/?secret=fixture`;
      document.body.append(frame);
    }, app.id);
    await expect
      .poll(async () => {
        const results = await Promise.all(
          host
            .frames()
            .slice(1)
            .map((frame) =>
              frame
                .locator('#task-title')
                .count()
                .catch(() => 0),
            ),
        );
        return results.reduce((a, b) => a + b, 0);
      })
      .toBe(0);
    await recover(app.page);
  } finally {
    await app.close();
  }
});
