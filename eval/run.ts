import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { runChecks } from '@/engine/checks/runChecks';
import { profileDataset } from '@/engine/profile/profileDataset';
import { tryCatch } from '@/lib/tryCatch';
import { readDataset } from './readDataset';
import { readTruth } from './readTruth';
import { findTruthMismatches } from './score/findTruthMismatches';
import { formatScoreTable } from './score/formatScoreTable';
import { scoreIssues } from './score/scoreIssues';

const DATASET_PATH = 'eval/datasets/customers.csv';
const TRUTH_PATH = 'eval/datasets/customers.truth.json';
const RESULTS_PATH = 'eval/results/checks-only.json';
const MAX_REPORTED_MISMATCHES = 10;
const USAGE = 'Usage: yarn eval --checks-only';

main();

function main(): void {
  const { result: options, error: usageError } = tryCatch(
    () => parseArgs({ options: { 'checks-only': { type: 'boolean' } } }).values
  );
  if (usageError || !options['checks-only']) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const { error } = tryCatch(scoreChecksOnly);
  if (!error) return;

  console.error(error.message);
  process.exitCode = 1;
}

function scoreChecksOnly(): void {
  const dataset = readDataset(DATASET_PATH);
  const truth = readTruth(TRUTH_PATH);

  const mismatches = findTruthMismatches({ truth, dataset });
  if (mismatches.length > 0) {
    const reported = mismatches.slice(0, MAX_REPORTED_MISMATCHES);
    const unreported = mismatches.length - reported.length;
    const more = unreported > 0 ? [`...and ${unreported} more.`] : [];
    throw new Error(
      [
        `${TRUTH_PATH} does not match ${DATASET_PATH}. Run yarn eval:data.`,
        ...reported,
        ...more,
      ].join('\n')
    );
  }

  const issues = runChecks({ dataset, profile: profileDataset(dataset) });
  const scores = scoreIssues({ issues, truth, dataset });

  console.log(
    `Checks only: ${dataset.rows.length} rows, ${issues.length} issues\n`
  );
  console.log(formatScoreTable(scores));

  const results = {
    run: 'checks-only',
    dataset: DATASET_PATH,
    seed: truth.seed,
    rows: dataset.rows.length,
    issues: issues.length,
    scores,
  };
  mkdirSync(dirname(RESULTS_PATH), { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n');
}
