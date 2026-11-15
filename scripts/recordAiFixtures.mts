import { readFileSync, writeFileSync } from 'node:fs';
import type { AiTaskOutcome } from '@/ai/aiTaskOutcome';
import { DEFAULT_AI_MODEL_ID } from '@/ai/models';
import { createOpenRouterClient } from '@/ai/openRouterClient';
import { buildAssessSuspiciousRowsRequests } from '@/ai/tasks/assessSuspiciousRows/buildAssessSuspiciousRowsRequests';
import { runAssessSuspiciousRows } from '@/ai/tasks/assessSuspiciousRows/runAssessSuspiciousRows';
import { buildConfirmDuplicatesRequests } from '@/ai/tasks/confirmDuplicates/buildConfirmDuplicatesRequests';
import { runConfirmDuplicates } from '@/ai/tasks/confirmDuplicates/runConfirmDuplicates';
import { buildNormalizeValuesRequests } from '@/ai/tasks/normalizeValues/buildNormalizeValuesRequests';
import { runNormalizeValues } from '@/ai/tasks/normalizeValues/runNormalizeValues';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { runChecks } from '@/engine/checks/runChecks';
import { findNearDuplicateCandidates } from '@/engine/matching/findNearDuplicateCandidates';
import { profileDataset } from '@/engine/profile/profileDataset';

// Makes real model calls on the demo sample and saves the replies as the fixtures the e2e runs
// serve. It costs money, so it records only the tasks named on the command line:
// `yarn ai:record normalize-values confirm-duplicates`. Reads OPENROUTER_API_KEY from the environment.
const SAMPLE_PATH = 'public/samples/customers.csv';
const FIXTURE_FOLDER = 'e2e/fixtures/ai';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error(
    'Set OPENROUTER_API_KEY before recording, for example in .env.'
  );
  process.exit(1);
}

const parsed = parseCsv(decodeText(new Uint8Array(readFileSync(SAMPLE_PATH))));
if (!parsed.ok) throw new Error(`The sample did not parse: ${parsed.reason}`);

const { dataset } = parsed;
const profile = profileDataset(dataset);
const client = createOpenRouterClient({ apiKey });
const model = DEFAULT_AI_MODEL_ID;

const tasks = {
  'normalize-values': () =>
    record({
      requests: buildNormalizeValuesRequests({
        profile,
        headers: dataset.columns.map(({ header }) => header),
        rowCount: dataset.rows.length,
      }),
      run: (request) => runNormalizeValues({ client, model, request }),
    }),
  'confirm-duplicates': () =>
    record({
      requests: buildConfirmDuplicatesRequests({
        dataset,
        candidates: findNearDuplicateCandidates({ dataset, profile }),
      }),
      run: (request) => runConfirmDuplicates({ client, model, request }),
    }),
  'assess-suspicious-rows': () =>
    record({
      requests: buildAssessSuspiciousRowsRequests({
        dataset,
        profile,
        issues: runChecks({ dataset, profile }),
      }),
      run: (request) => runAssessSuspiciousRows({ client, model, request }),
    }),
};

const names = process.argv.slice(2);
const isTaskName = (name: string): name is keyof typeof tasks => name in tasks;
if (names.length === 0 || !names.every(isTaskName)) {
  console.error(`Name the tasks to record: ${Object.keys(tasks).join(', ')}.`);
  process.exit(1);
}

for (const name of names) {
  const recordings = await tasks[name]();

  writeFileSync(
    `${FIXTURE_FOLDER}/${name}.json`,
    `${JSON.stringify(recordings, null, 2)}\n`
  );
  console.info(`Saved ${recordings.length} recordings of ${name}.`);
}

async function record<Request>({
  requests,
  run,
}: {
  requests: readonly Request[];
  run: (request: Request) => Promise<AiTaskOutcome<unknown>>;
}) {
  const recordings = [];

  for (const request of requests) {
    const outcome = await run(request);
    const response = outcome.ok
      ? { ok: true, result: outcome.result, calls: outcome.calls }
      : { ok: false, reason: outcome.reason, calls: outcome.calls };
    recordings.push({ request, response });
  }

  return recordings;
}
