import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SAMPLE = 'public/samples/customers.csv';
const SAMPLE_ROW_COUNT = 1150;
const LAST_ROW_NUMBER = SAMPLE_ROW_COUNT + 1;

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

  await page.getByRole('button', { name: 'Load another file' }).click();

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

test.describe('the data grid', () => {
  test('lists the fixture rows with spreadsheet row numbers', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByLabel('Choose a CSV file')
      .setInputFiles('e2e/fixtures/people.csv');

    const grid = page.getByRole('table', { name: 'Data' });
    await expect(
      grid.getByRole('columnheader', { name: 'email' })
    ).toBeVisible();
    await expect(grid.getByRole('rowheader')).toHaveText([
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);
    await expect(grid.getByText('hana.lee@example.com')).toBeVisible();
  });

  test('scrolls to the last row of the sample, which is numbered after the header', async ({
    page,
  }) => {
    await loadSample(page);
    const grid = page.getByRole('table', { name: 'Data' });
    await expect(
      grid.getByRole('rowheader', { name: '2', exact: true })
    ).toBeVisible();

    await grid.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    const lastRow = grid.getByRole('row', {
      name: new RegExp(`^${LAST_ROW_NUMBER}`),
    });
    await expect(lastRow).toBeVisible();
    await expect(lastRow).toContainText(/^\d+C-\d+/);
  });
});

test.describe('the issues', () => {
  test('lists every category with a count on the sample', async ({ page }) => {
    await loadSample(page);

    const categories = page.getByRole('group', {
      name: 'Filter issues by category',
    });
    for (const name of [
      'Duplicates',
      'Inconsistent values',
      'Missing data',
      'Suspicious records',
    ]) {
      const button = categories.getByRole('button', {
        name: new RegExp(`^${name} \\d`),
      });
      await expect(button).toBeEnabled();
    }
  });

  test('narrows the list to one category', async ({ page }) => {
    await loadSample(page);

    await filterTo(page, 'Missing data');

    const cards = page
      .getByRole('list', { name: 'Issues' })
      .getByRole('article');
    await expect(cards.first()).toBeVisible();
    await expect(cards.filter({ hasText: 'Exact duplicate rows' })).toHaveCount(
      0
    );
    await expect(
      cards.first().getByText('Missing data', { exact: true })
    ).toBeVisible();
  });
});

test.describe('reviewing', () => {
  test('accepting the whitespace issue cleans a known cell, and the toggle shows the original again', async ({
    page,
  }) => {
    await loadSample(page);
    const { rowNumber } = await selectWhitespaceIssue(page);

    await page
      .getByRole('article', { name: 'Extra spaces in “first_name”' })
      .getByRole('button', { name: 'Accept' })
      .click();
    await jumpTo({ page, rowNumber });

    const row = page.getByRole('row', { name: new RegExp(`^${rowNumber}`) });
    await expect(row).toContainText('changed from');
    await expect(row.getByRole('img', { name: 'space' })).toHaveCount(0);

    await page.getByRole('radio', { name: 'Original' }).click();

    await expect(row).not.toContainText('changed from');
    await expect(row.getByRole('img', { name: 'space' }).first()).toBeVisible();
  });

  test('shows how many issues are decided', async ({ page }) => {
    await loadSample(page);
    await expect(
      page.getByRole('progressbar', { name: /^0 of \d+ decided$/ })
    ).toBeVisible();

    await filterTo(page, 'Inconsistent values');
    await page
      .getByRole('article', { name: 'Extra spaces in “first_name”' })
      .getByRole('button', { name: 'Accept' })
      .click();

    await expect(
      page.getByRole('progressbar', { name: /^1 of \d+ decided$/ })
    ).toBeVisible();
  });

  test('selecting an issue and jumping to one of its rows shows that row, highlighted', async ({
    page,
  }) => {
    await loadSample(page);
    const { rowNumber } = await selectWhitespaceIssue(page);

    await jumpTo({ page, rowNumber });

    const row = page.getByRole('row', { name: new RegExp(`^${rowNumber}`) });
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute('aria-current', 'true');
    await expect(row.getByRole('cell').nth(1)).toHaveClass(
      /bg-inconsistent\/20/
    );
  });
});

test.describe('exporting', () => {
  test('downloads the cleaned file with the accepted change and a log that lists its row', async ({
    page,
  }) => {
    await loadSample(page);
    const { rowNumber } = await selectWhitespaceIssue(page);
    await page
      .getByRole('article', { name: 'Extra spaces in “first_name”' })
      .getByRole('button', { name: 'Accept' })
      .click();

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export' });
    await expect(dialog.getByText('10 cells')).toBeVisible();

    const cleaned = await download({ page, button: 'Download cleaned CSV' });
    const log = await download({ page, button: 'Download change log' });

    expect(cleaned.name).toBe('customers.cleaned.csv');
    expect(cleaned.text).not.toBe(readFileSync(SAMPLE, 'utf8'));
    expect(cleaned.text.split('\n')).toHaveLength(SAMPLE_ROW_COUNT + 2);
    const lineIndex = Number(rowNumber) - 1;
    const original = firstNameOf(readFileSync(SAMPLE, 'utf8'), lineIndex);
    expect(original).not.toBe(original.trim());
    expect(firstNameOf(cleaned.text, lineIndex)).toBe(original.trim());
    expect(log.name).toBe('customers.changes.csv');
    expect(log.text).toContain(`${rowNumber},first_name,2,changed`);
    expect(log.text).toContain('trimWhitespace,whitespace:1');
  });

  test('downloads exactly the input rows when nothing is decided', async ({
    page,
  }) => {
    await loadSample(page);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Export' }).getByText('0 cells')
    ).toBeVisible();
    const cleaned = await download({ page, button: 'Download cleaned CSV' });
    const log = await download({ page, button: 'Download change log' });

    expect(cleaned.text).toBe(readFileSync(SAMPLE, 'utf8'));
    expect(log.text.trim().split('\n')).toHaveLength(1);
  });

  test('says how many issues are still pending', async ({ page }) => {
    await loadSample(page);

    await page.getByRole('button', { name: 'Export', exact: true }).click();

    await expect(
      page.getByRole('dialog', { name: 'Export' }).getByText(/issues$/)
    ).toBeVisible();
    await expect(
      page.getByText('Pending issues leave the data as it is in the file.')
    ).toBeVisible();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows Issues and Data as tabs, without scrolling the page sideways', async ({
    page,
  }) => {
    await loadSample(page);

    const overflow = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
    expect(await overflow()).toBe(0);
    await expect(page.getByRole('tab', { name: /^Issues/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByRole('table', { name: 'Data' })).toBeHidden();

    await page.getByRole('tab', { name: 'Data' }).click();

    await expect(page.getByRole('table', { name: 'Data' })).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Filter issues by category' })
    ).toBeHidden();
    expect(await overflow()).toBe(0);
  });

  test('keeps the issue chosen in the Issues tab open in the Data tab', async ({
    page,
  }) => {
    await loadSample(page);
    await filterTo(page, 'Inconsistent values');
    await page
      .getByRole('article', { name: 'Extra spaces in “first_name”' })
      .getByRole('button')
      .first()
      .click();

    await page.getByRole('tab', { name: 'Data' }).click();

    await expect(
      page.getByRole('region', { name: 'Issue detail' }).getByRole('heading', {
        name: 'Extra spaces in “first_name”',
      })
    ).toBeVisible();
  });
});

async function loadSample(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Choose a CSV file').setInputFiles(SAMPLE);
  await expect(
    page.getByRole('group', { name: 'Filter issues by category' })
  ).toBeVisible();
}

function firstNameOf(csv: string, lineIndex: number): string {
  return csv.split('\n')[lineIndex]?.split(',')[1] ?? '';
}

async function filterTo(page: Page, category: string): Promise<void> {
  await page
    .getByRole('group', { name: 'Filter issues by category' })
    .getByRole('button', { name: new RegExp(`^${category}`) })
    .click();
}

async function selectWhitespaceIssue(
  page: Page
): Promise<{ rowNumber: string }> {
  await filterTo(page, 'Inconsistent values');
  const card = page.getByRole('article', {
    name: 'Extra spaces in “first_name”',
  });
  await card.getByRole('button').first().click();

  const firstRow = page
    .getByRole('region', { name: 'Issue detail' })
    .getByRole('list', { name: 'Affected rows' })
    .getByRole('button')
    .first();
  const label = (await firstRow.getAttribute('aria-label')) ?? '';
  const rowNumber = label.match(/row (\d+)/)?.[1];
  if (!rowNumber) throw new Error(`No row number in "${label}"`);

  return { rowNumber };
}

async function jumpTo({
  page,
  rowNumber,
}: {
  page: Page;
  rowNumber: string;
}): Promise<void> {
  await page
    .getByRole('button', { name: `Show row ${rowNumber} in the grid` })
    .click();
  await expect(
    page.getByRole('row', { name: new RegExp(`^${rowNumber}`) })
  ).toBeVisible();
}

async function download({
  page,
  button,
}: {
  page: Page;
  button: string;
}): Promise<{ name: string; text: string }> {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await pending;
  const path = await file.path();

  return { name: file.suggestedFilename(), text: readFileSync(path, 'utf8') };
}
