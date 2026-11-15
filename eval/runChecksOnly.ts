import { mkdirSync, writeFileSync } from 'node:fs';
import { runChecks } from '@/engine/checks/runChecks';
import { profileDataset } from '@/engine/profile/profileDataset';
import type { ChecksOnlyResult } from './checksOnlyResult';
import { loadEvalData } from './loadEvalData';
import { CHECKS_ONLY_PATH, DATASET_PATH, RESULTS_FOLDER } from './evalPaths';
import { formatScoreTable } from './score/formatScoreTable';
import { scoreIssues } from './score/scoreIssues';

export function runChecksOnly(): void {
  const { dataset, truth } = loadEvalData();
  const issues = runChecks({ dataset, profile: profileDataset(dataset) });
  const scores = scoreIssues({ issues, truth, dataset });

  console.log(
    `Checks only: ${dataset.rows.length} rows, ${issues.length} issues\n`
  );
  console.log(formatScoreTable(scores));

  const result: ChecksOnlyResult = {
    run: 'checks-only',
    dataset: DATASET_PATH,
    seed: truth.seed,
    rows: dataset.rows.length,
    issues: issues.length,
    scores,
  };
  mkdirSync(RESULTS_FOLDER, { recursive: true });
  writeFileSync(CHECKS_ONLY_PATH, JSON.stringify(result, null, 2) + '\n');
}
