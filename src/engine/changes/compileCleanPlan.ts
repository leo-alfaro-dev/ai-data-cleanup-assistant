import type { Dataset } from '@/engine/dataset/dataset';
import type { AcceptedChange } from './acceptedChange';
import type { CleanPlan } from './cleanPlan';
import { compareAcceptedChanges } from './compareAcceptedChanges';
import { compileCellValues } from './compileCellValues';
import { compileColumnRules } from './compileColumnRules';
import { compileRemovedRows } from './compileRemovedRows';
import type { PlanEntry } from './planEntry';

export function compileCleanPlan({
  accepted,
  dataset,
}: {
  accepted: readonly AcceptedChange[];
  dataset: Pick<Dataset, 'columns' | 'rows'>;
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
  return [...accepted]
    .sort(compareAcceptedChanges)
    .map(({ issueId, change }) => ({
      change,
      origin: { issueId, kind: change.kind },
    }));
}
