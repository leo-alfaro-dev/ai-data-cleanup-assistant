import { expect, test } from '@playwright/test';

test('the workspace loads', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'AI Data Cleanup Assistant' })
  ).toBeVisible();
});

test('a chosen CSV is parsed in the worker and its facts appear', async ({
  page,
}) => {
  await page.goto('/');

  await page
    .getByLabel('Choose a CSV file')
    .setInputFiles('e2e/fixtures/people.csv');

  const loadedFile = page.getByRole('region', { name: 'Loaded file' });
  await expect(
    loadedFile.getByRole('heading', { name: 'people.csv' })
  ).toBeVisible();
  await expect(loadedFile).toContainText(
    '8 rows × 6 columns · Comma-separated'
  );

  await loadedFile.getByRole('button', { name: 'Load another file' }).click();

  await expect(page.getByLabel('Choose a CSV file')).toBeAttached();
  await expect(loadedFile).toBeHidden();
});

test('a workbook gets the message to export it as CSV', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Choose a CSV file').setInputFiles({
    name: 'budget.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]),
  });

  const failure = page
    .getByRole('alert')
    .filter({ hasText: 'Could not load budget.xlsx' });
  await expect(failure).toBeVisible();
  await expect(failure).toContainText('save it as CSV first');
});
