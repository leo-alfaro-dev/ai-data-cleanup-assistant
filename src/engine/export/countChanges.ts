import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import { buildChangeLog } from './buildChangeLog';

export function countChanges({
  dataset,
  accepted,
}: {
  dataset: Dataset;
  accepted: readonly AcceptedChange[];
}): { cellsChanged: number; rowsRemoved: number } {
  const plan = compileCleanPlan({ accepted, dataset });
  const tally = { cellsChanged: 0, rowsRemoved: 0 };

  for (const entry of buildChangeLog({ dataset, plan })) {
    if (entry.kind === 'cellChanged') tally.cellsChanged += 1;
    if (entry.kind === 'rowRemoved') tally.rowsRemoved += 1;
  }

  return tally;
}
