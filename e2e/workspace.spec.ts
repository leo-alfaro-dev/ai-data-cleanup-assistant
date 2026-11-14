import { expect, test } from '@playwright/test';

test('the workspace loads', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'AI Data Cleanup Assistant' })
  ).toBeVisible();
});
