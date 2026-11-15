import type { AiJob } from './aiJob';
import type { AiRun } from './aiRun';

export function withJobState({
  run,
  key,
  state,
}: {
  run: AiRun | null;
  key: string;
  state: AiJob['state'];
}): AiRun | null {
  if (!run) return run;

  return {
    ...run,
    jobs: run.jobs.map((job) => (job.key === key ? { ...job, state } : job)),
  };
}
