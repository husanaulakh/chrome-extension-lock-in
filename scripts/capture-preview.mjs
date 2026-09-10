import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:3000');
  await page
    .getByLabel('What are you working on?')
    .fill('Prepare for the next exam');
  await page.screenshot({ path: 'artifacts/store-preview-1280x800.png' });
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.screenshot({
    path: 'artifacts/preview-dashboard.png',
    fullPage: true,
  });
} finally {
  await browser.close();
}
