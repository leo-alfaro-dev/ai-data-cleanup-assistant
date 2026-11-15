import { AI_TASK_NAMES } from '@/ai/aiTaskName';
import type { AiJob } from './aiJob';
import type { AiTaskSummary } from './aiTaskSummary';

// One entry per task that has requests. A task is failed once every one of its requests has
// settled and one of them failed; the requests that succeeded have landed all the same.
export function summarizeAiTasks(jobs: readonly AiJob[]): AiTaskSummary[] {
  return AI_TASK_NAMES.flatMap((task): AiTaskSummary[] => {
    const own = jobs.filter(({ request }) => request.task === task);
    if (own.length === 0) return [];

    const total = own.length;
    const failed = own.flatMap(({ state }) =>
      state.status === 'failed' ? [state] : []
    );
    const settled =
      own.filter(({ state }) => state.status === 'done').length + failed.length;
    const isUntouched = own.every(({ state }) => state.status === 'queued');

    const [firstFailure] = failed;
    if (settled === total && firstFailure) {
      return [
        {
          task,
          total,
          settled,
          status: 'failed',
          reason: firstFailure.reason,
          failedCount: failed.length,
        },
      ];
    }
    if (settled === total) return [{ task, total, settled, status: 'done' }];
    if (isUntouched) return [{ task, total, settled, status: 'queued' }];

    return [{ task, total, settled, status: 'running' }];
  });
}
