export const AI_CONCURRENCY = 3;

/**
 * Runs the jobs with at most `concurrency` in flight, each started as another finishes. Once the
 * signal aborts nothing new starts. `run` handles its own failures: it must not throw.
 */
export async function runAiTasks<Job>({
  jobs,
  signal,
  run,
  concurrency = AI_CONCURRENCY,
}: {
  jobs: readonly Job[];
  signal: AbortSignal;
  run: (job: Job) => Promise<void>;
  concurrency?: number;
}): Promise<void> {
  let next = 0;
  const drain = async () => {
    while (!signal.aborted) {
      const job = jobs[next];
      next += 1;
      if (job === undefined) return;

      await run(job);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, drain)
  );
}
