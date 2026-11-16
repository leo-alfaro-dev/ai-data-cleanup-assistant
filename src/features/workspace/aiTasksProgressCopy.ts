import type { AiTaskSummary } from './state/aiTaskSummary';

export function aiTasksProgressCopy(
  summaries: readonly AiTaskSummary[]
): string {
  const doneCount = summaries.filter(({ status }) => status === 'done').length;
  const failedCount = summaries.filter(
    ({ status }) => status === 'failed'
  ).length;
  const failed = failedCount > 0 ? `, ${failedCount} failed` : '';

  return `${doneCount} of ${summaries.length} done${failed}`;
}
