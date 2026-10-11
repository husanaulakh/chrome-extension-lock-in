import { test, expect } from '@playwright/test';

test('download journey provides actual packages and readable help', async ({ page, request }) => {
  await page.goto('/download');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A little morefocus.');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Chromium ZIP' }).click();
  expect((await download).suggestedFilename()).toBe('lock-in-chromium.zip');
  const response = await request.get('/lock-in-firefox.zip');
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 2).toString()).toBe('PK');
  await page.getByRole('navigation').getByRole('link', { name: 'Support' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your first session' })).toBeVisible();
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
});

test('public pages and preview keep navigation and controls usable on small screens and at 200% enlargement', async ({ page }) => {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ['/download', '/support', '/privacy', '/']) {
      await page.goto(url);
      if (width === 1280) await page.addStyleTag({ content: 'html { zoom: 2; }' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (url === '/') await expect(page.getByRole('link', { name: /^Help/ })).toBeVisible();
    }
  }
});

test('keyboard can skip navigation and follow the install journey', async ({ page }) => {
  await page.goto('/download');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Get the extension', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#install$/);
});
