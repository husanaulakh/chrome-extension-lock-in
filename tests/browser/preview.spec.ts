import { test, expect, type Page } from '@playwright/test';
type Tool = { execute(input: unknown): unknown };
type ToolWindow = Window & { __tools: Record<string, Tool> };
async function start(page: Page, level = 'Committed', minutes = 25) {
  await page.goto('/');
  await page
    .getByLabel('What are you working on?')
    .fill('Finish the first draft');
  await page.getByRole('radio', { name: new RegExp('^' + level) }).check();
  if (minutes !== 25)
    await page.getByLabel('Custom duration in minutes').fill(String(minutes));
  await page
    .getByRole('button', { name: `Lock in for ${minutes} minutes` })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Finish the first draft' }),
  ).toBeVisible();
}
test('setup, block, temporary access, reload, and completed report', async ({
  page,
}) => {
  await page.clock.install();
  await start(page, 'Committed', 1);
  await page.locator('#try-url').fill('youtube.com');
  await page.getByRole('button', { name: 'Try', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Not right now.' }),
  ).toBeVisible();
  await page.getByLabel('Need it for your task?').fill('Review the lecture');
  await page.getByRole('button', { name: 'Allow for 5 minutes' }).click();
  await expect(page.getByRole('status')).toContainText('youtube.com allowed');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Finish the first draft' }),
  ).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(
    page.getByText('Session complete. Your time is yours again.'),
  ).toBeVisible();
  await page.locator('.history-item summary').click();
  await expect(
    page.getByText('1 attempts stopped · 1 access requests'),
  ).toBeVisible();
  await expect(page.locator('.history-item .domain-stat')).toContainText(
    'youtube.com',
  );
});
test('committed exit cannot skip the wait and survives reload', async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByLabel('Why are you leaving?').fill('Unexpected meeting');
  await page.getByRole('button', { name: 'Begin exit · 60 seconds' }).click();
  await expect(
    page.getByRole('button', { name: 'End this session', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByText('Need to leave?', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'End this session', exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(61000);
  await page
    .getByRole('button', { name: 'End this session', exact: true })
    .click();
  await expect(page.getByText(/· escaped/)).toBeVisible();
});
test('locked mode blocks access but provides explicit recovery', async ({
  page,
}) => {
  await start(page, 'Locked');
  await page.getByRole('button', { name: 'Try', exact: true }).click();
  await expect(
    page.getByText('Temporary access is off for this locked session.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Allow for 5 minutes' }),
  ).toHaveCount(0);
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByRole('button', { name: 'Open recovery' }).click();
  await page.getByRole('button', { name: 'End through recovery' }).click();
  await expect(page.getByText(/· recovered/)).toBeVisible();
});
test('invalid hostname cannot start and narrow layout does not overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/');
  await page.getByLabel('What are you working on?').fill('Write a draft');
  await page.getByLabel('Focus website').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Lock in for 25 minutes' }).click();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Lock in for 25 minutes' }),
  ).toBeVisible();
});
test('damaged storage is visible and recoverable', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('lock-in-v1', '{'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Technical recovery' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Lock in for 25 minutes' }),
  ).toBeDisabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Clear damaged data' }).click();
  await expect(
    page.getByRole('button', { name: 'Lock in for 25 minutes' }),
  ).toBeEnabled();
});
test('WebMCP contract validates input and updates the visible session', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as ToolWindow).__tools = {};
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool(
          tool: Tool & { name: string },
          options: { signal: AbortSignal },
        ) {
          (window as unknown as ToolWindow).__tools[tool.name] = tool;
          options.signal.addEventListener(
            'abort',
            () => delete (window as unknown as ToolWindow).__tools[tool.name],
          );
        },
      },
    });
  });
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys((window as unknown as ToolWindow).__tools),
      ),
    )
    .toContain('start_focus_session');
  const invalid = await page.evaluate(() => {
    try {
      (window as unknown as ToolWindow).__tools.start_focus_session.execute({});
      return false;
    } catch {
      return true;
    }
  });
  expect(invalid).toBe(true);
  await page.evaluate(() => {
    (window as unknown as ToolWindow).__tools.start_focus_session.execute({
      task: 'Write the report',
      focus: 'example.com',
      minutes: 25,
      level: 'committed',
      resources: [],
    });
  });
  await expect(
    page.getByRole('heading', { name: 'Write the report' }),
  ).toBeVisible();
});
test('no external requests or page errors during a preview session', async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://localhost:3000') &&
      !r.url().startsWith('data:')
    )
      external.push(r.url());
  });
  await start(page, 'Light');
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByRole('button', { name: 'Begin exit', exact: true }).click();
  await page
    .getByRole('button', { name: 'End this session', exact: true })
    .click();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test('desktop and mobile previews remain readable with enlarged text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Lock in for 25 minutes' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'artifacts/preview-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'artifacts/preview-mobile.png',
    fullPage: true,
  });
  await page.addStyleTag({ content: 'html {font-size:200% !important}' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('exact-page setup, optional resources, custom settings and extending a session', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Additional resources')).toHaveCount(0);
  await page.getByLabel('What are you working on?').fill('Practice exam');
  await page
    .getByLabel('Focus website')
    .fill(
      'https://www.mcatofficialprep.org/app/aamc-mcat-practice-exam-3#exams/take_driver/9000',
    );
  await page.getByRole('button', { name: 'Entire website' }).click();
  await page.getByRole('button', { name: /More resources/ }).click();
  await page.getByLabel('Additional resources').fill('reference.example');
  await page.getByLabel('Domains to block').fill('youtube.com');
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByLabel('Maximum access requests').fill('2');
  await page.getByLabel('Minutes per access request').fill('7');
  await page.getByRole('button', { name: 'Lock in for 25 minutes' }).click();
  await page.getByLabel('Minutes to add').fill('15');
  await page.getByRole('button', { name: 'Add time', exact: true }).click();
  await page.reload();
  const session = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lock-in-v1')!).session,
  );
  expect(session.scope).toBe('exact');
  expect(session.options.accessLimit).toBe(2);
  expect(session.options.accessMinutes).toBe(7);
  expect(session.endsAt - session.startedAt).toBe(40 * 60000);
  await expect(
    page.getByRole('heading', { name: 'Practice exam', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/view=dashboard/);
});

test('reuse last setup requires review and shows the updated finish time', async ({
  page,
}) => {
  await start(page, 'Light', 1);
  await expect(page.locator('.finish-at')).toContainText('Finishes at');
  await page.getByText('Need to leave?', { exact: true }).click();
  await page.getByRole('button', { name: 'Begin exit' }).click();
  await page
    .getByRole('button', { name: 'End this session', exact: true })
    .click();
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await page.getByLabel('What are you working on?').fill('Changed task');
  await page.getByRole('button', { name: /Use last setup/ }).click();
  await expect(page.getByLabel('What are you working on?')).toHaveValue(
    'Finish the first draft',
  );
  await expect(
    page.getByRole('button', { name: 'Lock in for 1 minutes' }),
  ).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
});

test('pre-session URL check stays current and never starts or records a session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Focus website').fill('https://example.com/exam#9000');
  await page.getByRole('button', { name: 'Entire website' }).click();
  await page.getByRole('button', { name: /More resources/ }).click();
  await page
    .getByLabel('Will this page be allowed?')
    .fill('https://example.com/exam#9001');
  await page.getByRole('button', { name: 'Check URL', exact: true }).click();
  await expect(page.locator('.rule-result')).toHaveText(
    'Blocked by these rules.',
  );
  await page
    .getByLabel('Additional resources')
    .fill('https://example.com/exam#9001');
  await expect(page.locator('.rule-result')).toHaveText(
    'Allowed by these rules.',
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lock-in-v1')!),
  );
  expect(saved.session).toBeNull();
  expect(saved.history).toEqual([]);
  await page.getByLabel('What are you working on?').fill('Read the exam');
  await page.getByRole('button', { name: 'Lock in for 25 minutes' }).click();
  await expect(page).toHaveTitle(/\d+:\d{2} — Lock in/);
});
