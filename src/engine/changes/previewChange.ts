import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { Change } from './change';
import type { ChangePreview } from './changePreview';
import { compileCleanPlan } from './compileCleanPlan';
import { createChangeTally } from './createChangeTally';
import { listChangedCells } from './listChangedCells';

export function previewChange({
  change,
  dataset,
}: {
  change: Change;
  dataset: Dataset;
}): ChangePreview {
  const plan = compileCleanPlan({
    accepted: [{ issueId: PREVIEW_ISSUE_ID, change }],
    dataset,
  });
  const tally = createChangeTally();

  for (const cell of listChangedCells({ change, plan, dataset })) {
    tally.add(cell);
  }

  return tally.toPreview(plan.removedRows.size);
}

const PREVIEW_ISSUE_ID = toIssueId('preview');
