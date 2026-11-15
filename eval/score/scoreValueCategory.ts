import type { Dataset } from '@/engine/dataset/dataset';
import type { IssueCategory } from '@/engine/issues/issue';
import type { CategoryScore } from './categoryScore';
import { collectCellClaims } from './collectCellClaims';
import { countShared } from './countShared';
import type { ScoredIssue } from './scoredIssue';
import { tallySuggestions } from './tallySuggestions';
import { toCategoryScore } from './toCategoryScore';
import { toCellKey } from './toCellKey';
import type { TruthIndex } from './truthIndex';

export function scoreValueCategory({
  category,
  issues,
  index,
  dataset,
}: {
  category: Exclude<IssueCategory, 'duplicate'>;
  issues: readonly ScoredIssue[];
  index: TruthIndex;
  dataset: Dataset;
}): CategoryScore {
  const categoryIssues = issues.filter((issue) => issue.category === category);
  const planted = [...index.valueErrors.values()].filter(
    (error) => error.category === category
  );
  const plantedCells = new Set(planted.map(toCellKey));
  const plantedRows = new Set(planted.map(({ rowId }) => rowId));
  const claims = collectCellClaims({
    issues: categoryIssues,
    copyRows: index.copyRows,
  });

  const foundErrors = planted.filter(
    (error) =>
      claims.rows.has(error.rowId) || claims.cells.has(toCellKey(error))
  );

  return toCategoryScore({
    planted: planted.length,
    claimed: claims.cells.size + claims.rows.size,
    correctClaims:
      countShared(claims.cells, plantedCells) +
      countShared(claims.rows, plantedRows),
    found: foundErrors.length,
    ...tallySuggestions({ issues: categoryIssues, index, dataset }),
  });
}
