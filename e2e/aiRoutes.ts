import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

type Recording<Request> = { request: Request; response: unknown };

function readRecordings<Request>(task: string): Recording<Request>[] {
  return JSON.parse(readFileSync(`e2e/fixtures/ai/${task}.json`, 'utf8'));
}

const normalizeValues = readRecordings<{ column: unknown }>('normalize-values');
const confirmDuplicates = readRecordings<unknown>('confirm-duplicates');
const assessSuspiciousRows = readRecordings<unknown>('assess-suspicious-rows');

const NOTHING_FOUND = { ok: true, calls: [] };

// Serves the replies recorded from a real model for the sample, so no e2e run reaches one. A
// request that was not recorded gets an answer that finds nothing.
export async function mockAiRoutes(
  page: Page,
  {
    beforeAnswer,
    failFirst = 0,
  }: {
    beforeAnswer?: () => Promise<void>;
    // Answers this many requests as a server without a key would, before serving the recordings.
    failFirst?: number;
  } = {}
): Promise<void> {
  let failuresLeft = failFirst;
  const answer = async (route: Route, reply: () => unknown) => {
    await beforeAnswer?.();

    if (failuresLeft > 0) {
      failuresLeft -= 1;
      await route.fulfill({
        status: 503,
        json: { ok: false, reason: 'aiNotConfigured', calls: [] },
      });
      return;
    }

    await route.fulfill({ json: reply() });
  };

  await page.route('**/api/ai/normalize-values', (route) =>
    answer(route, () => {
      const { request } = route.request().postDataJSON();
      const recording = normalizeValues.find(
        ({ request: recorded }) =>
          JSON.stringify(recorded.column) === JSON.stringify(request.column)
      );

      return (
        recording?.response ?? {
          ...NOTHING_FOUND,
          result: {
            column: request.column,
            groups: [],
            placeholders: [],
            claimCount: 0,
            droppedClaims: 0,
          },
        }
      );
    })
  );

  await page.route('**/api/ai/confirm-duplicates', (route) =>
    answer(
      route,
      () =>
        confirmDuplicates[0]?.response ?? {
          ...NOTHING_FOUND,
          result: { duplicates: [], claimCount: 0, droppedClaims: 0 },
        }
    )
  );

  await page.route('**/api/ai/assess-suspicious-rows', (route) =>
    answer(
      route,
      () =>
        assessSuspiciousRows[0]?.response ?? {
          ...NOTHING_FOUND,
          result: { rows: [], claimCount: 0, droppedClaims: 0 },
        }
    )
  );
}
