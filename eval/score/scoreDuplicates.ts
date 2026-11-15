import type { Dataset } from '@/engine/dataset/dataset';
import type { CategoryScore } from './categoryScore';
import { countShared } from './countShared';
import type { ScoredIssue } from './scoredIssue';
import { tallySuggestions } from './tallySuggestions';
import { toCategoryScore } from './toCategoryScore';
import type { TruthIndex } from './truthIndex';

export function scoreDuplicates({
  issues,
  index,
  dataset,
}: {
  issues: readonly ScoredIssue[];
  index: TruthIndex;
  dataset: Dataset;
}): CategoryScore {
  const duplicateIssues = issues.filter(
    ({ category }) => category === 'duplicate'
  );
  const claimed = new Set(duplicateIssues.flatMap(({ rows }) => rows));
  const overlap = countShared(claimed, index.duplicateRows);

  return toCategoryScore({
    planted: index.duplicateRows.size,
    claimed: claimed.size,
    correctClaims: overlap,
    found: overlap,
    ...tallySuggestions({ issues: duplicateIssues, index, dataset }),
  });
}
