import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runChecks } from '@/engine/checks/runChecks';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { findNearDuplicateCandidates } from '@/engine/matching/findNearDuplicateCandidates';
import { profileDataset } from '@/engine/profile/profileDataset';
import { aiRouteResponse } from './aiRouteResponse';
import { AI_TASKS } from './aiTasks';
import { buildAssessSuspiciousRowsRequests } from './tasks/assessSuspiciousRows/buildAssessSuspiciousRowsRequests';
import { buildConfirmDuplicatesRequests } from './tasks/confirmDuplicates/buildConfirmDuplicatesRequests';
import { buildNormalizeValuesRequests } from './tasks/normalizeValues/buildNormalizeValuesRequests';

function readSample() {
  const parsed = parseCsv(
    decodeText(new Uint8Array(readFileSync('public/samples/customers.csv')))
  );
  if (!parsed.ok) throw new Error('The sample did not parse');

  return { dataset: parsed.dataset, profile: profileDataset(parsed.dataset) };
}

function readRecordings(
  task: string
): { request: unknown; response: unknown }[] {
  return JSON.parse(readFileSync(`e2e/fixtures/ai/${task}.json`, 'utf8'));
}

const { dataset, profile } = readSample();

// The e2e runs answer with these recordings, so they must still be what the builders send for the
// sample, and what the routes' contracts read. Re-record with `yarn ai:record <task>`.
describe('the recorded AI replies of the e2e runs', () => {
  it.each([
    [
      'normalize-values',
      () =>
        buildNormalizeValuesRequests({
          profile,
          headers: dataset.columns.map(({ header }) => header),
          rowCount: dataset.rows.length,
        }),
    ],
    [
      'confirm-duplicates',
      () =>
        buildConfirmDuplicatesRequests({
          dataset,
          candidates: findNearDuplicateCandidates({ dataset, profile }),
        }),
    ],
    [
      'assess-suspicious-rows',
      () =>
        buildAssessSuspiciousRowsRequests({
          dataset,
          profile,
          issues: runChecks({ dataset, profile }),
        }),
    ],
  ])('%s: were recorded for the requests built today', (task, build) => {
    const recorded = readRecordings(task).map(({ request }) => request);

    expect(recorded).toEqual(build());
  });

  it.each([
    ['normalize-values', 'normalizeValues'],
    ['confirm-duplicates', 'confirmDuplicates'],
    ['assess-suspicious-rows', 'assessSuspiciousRows'],
  ] as const)('%s: are read by the contract of the task', (file, task) => {
    for (const { response } of readRecordings(file)) {
      const envelope = aiRouteResponse.parse(response);

      expect(envelope.ok).toBe(true);
      if (!envelope.ok) continue;

      expect(AI_TASKS[task].parseResult(envelope.result)).not.toBeNull();
    }
  });
});
