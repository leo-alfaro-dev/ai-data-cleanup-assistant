import type { AiJobOutcome } from '@/ai/aiJobOutcome';
import type { AiJobRequest } from '@/ai/aiJobRequest';
import type { AiTaskResult } from '@/ai/aiTaskResult';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue } from '@/engine/issues/issue';
import { tryCatch } from '@/lib/tryCatch';
import type { AiJob, AiJobState } from './aiJob';
import { runAiTasks } from './runAiTasks';

export type SettledAiJob = {
  job: AiJob;
  body: string;
  outcome: AiJobOutcome;
  issues: Issue[];
  notes: AiNote[];
};

/**
 * Runs each job through the queue: asks the route, turns a reply into issues, and reports every
 * change. Nothing is reported once the run is no longer current.
 */
export async function runAiJobs({
  jobs,
  signal,
  isCurrent,
  post,
  buildIssues,
  onState,
  onSettled,
}: {
  jobs: readonly AiJob[];
  signal: AbortSignal;
  isCurrent: () => boolean;
  post: (
    request: AiJobRequest
  ) => Promise<{ body: string; outcome: AiJobOutcome }>;
  buildIssues: (
    taskResult: AiTaskResult
  ) => Promise<{ issues: Issue[]; notes: AiNote[] }>;
  onState: (args: { key: string; state: AiJobState }) => void;
  onSettled: (settled: SettledAiJob) => void;
}): Promise<void> {
  await runAiTasks({
    jobs,
    signal,
    run: async (job) => {
      if (!isCurrent()) return;
      onState({ key: job.key, state: { status: 'running' } });

      const { body, outcome } = await post(job.request);
      if (!isCurrent()) return;

      if (!outcome.ok) {
        onSettled({ job, body, outcome, issues: [], notes: [] });
        onState({
          key: job.key,
          state: { status: 'failed', reason: outcome.reason },
        });
        return;
      }

      const { result: built, error } = await tryCatch(() =>
        buildIssues(outcome.taskResult)
      );
      if (!isCurrent()) return;

      if (error) {
        const failure: AiJobOutcome = {
          ok: false,
          reason: 'unexpected',
          calls: outcome.calls,
        };
        onSettled({ job, body, outcome: failure, issues: [], notes: [] });
        onState({
          key: job.key,
          state: { status: 'failed', reason: 'unexpected' },
        });
        return;
      }

      // The issues land before the job reads as done, so a done task never has issues on the way.
      onSettled({ job, body, outcome, ...built });
      onState({ key: job.key, state: { status: 'done' } });
    },
  });
}
