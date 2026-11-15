import type { Dataset } from '@/engine/dataset/dataset';
import type { AcceptedChange } from './acceptedChange';
import type { CleanPlan } from './cleanPlan';
import { compileCellValues } from './compileCellValues';
import { compileColumnRules } from './compileColumnRules';
import { compileRemovedRows } from './compileRemovedRows';
import type { PlanEntry } from './planEntry';

export function compileCleanPlan({
  accepted,
  dataset,
}: {
  accepted: readonly AcceptedChange[];
  dataset: Dataset;
}): CleanPlan {
  const entries = toOrderedEntries(accepted);

  return {
    columnRules: compileColumnRules({ entries, columns: dataset.columns }),
    ...compileCellValues({ entries, dataset }),
    removedRows: compileRemovedRows(entries),
  };
}

function toOrderedEntries(
  accepted: readonly AcceptedChange[]
): readonly PlanEntry[] {
  return [...accepted].sort(compareIssueIds).map(({ issueId, change }) => ({
    change,
    origin: { issueId, kind: change.kind },
  }));
}

function compareIssueIds(
  first: AcceptedChange,
  second: AcceptedChange
): number {
  if (first.issueId < second.issueId) return -1;
  if (first.issueId > second.issueId) return 1;

  return 0;
}
