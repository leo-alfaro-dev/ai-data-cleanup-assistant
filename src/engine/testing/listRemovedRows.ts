import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import { acceptSuggestions } from './acceptSuggestions';

export function listRemovedRows({
  dataset,
  issues,
}: {
  dataset: Dataset;
  issues: readonly Issue[];
}): number[] {
  const { removedRows } = compileCleanPlan({
    accepted: acceptSuggestions(issues),
    dataset,
  });

  return [...removedRows.keys()].sort((first, second) => first - second);
}
