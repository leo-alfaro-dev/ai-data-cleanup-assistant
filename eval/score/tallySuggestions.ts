import type { ChangedCell } from '@/engine/changes/changedCell';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import { listChangedCells } from '@/engine/changes/listChangedCells';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { isBlank } from '@/engine/values/isBlank';
import type { ScoredIssue } from './scoredIssue';
import { toCellKey } from './toCellKey';
import type { TruthIndex } from './truthIndex';

// Each suggestion is scored alone, as the only accepted change: a duplicate issue by the rows it
// removes, any other by the cells it changes.
export function tallySuggestions({
  issues,
  index,
  dataset,
}: {
  issues: readonly ScoredIssue[];
  index: TruthIndex;
  dataset: Dataset;
}): { suggested: number; rightSuggestions: number } {
  let suggested = 0;
  let rightSuggestions = 0;

  for (const { category, suggestion } of issues) {
    if (!suggestion) continue;

    const plan = compileCleanPlan({
      accepted: [{ issueId: SUGGESTION_ISSUE_ID, change: suggestion }],
      dataset,
    });

    if (category === 'duplicate') {
      for (const rowId of plan.removedRows.keys()) {
        suggested += 1;
        if (index.copyRows.has(rowId)) rightSuggestions += 1;
      }
      continue;
    }

    for (const cell of listChangedCells({
      change: suggestion,
      plan,
      dataset,
    })) {
      if (index.copyRows.has(cell.rowId)) continue;

      suggested += 1;
      if (isRightValue({ cell, index })) rightSuggestions += 1;
    }
  }

  return { suggested, rightSuggestions };
}

const SUGGESTION_ISSUE_ID = toIssueId('suggestion');

function isRightValue({
  cell,
  index,
}: {
  cell: ChangedCell;
  index: TruthIndex;
}): boolean {
  const planted = index.valueErrors.get(toCellKey(cell));
  const cleanValue = planted?.cleanValue ?? cell.before;
  if (cell.after === cleanValue) return true;

  // Emptying a planted missing value is right: no suggestion may invent the value that was lost.
  return planted?.category === 'missing' && isBlank(cell.after);
}
