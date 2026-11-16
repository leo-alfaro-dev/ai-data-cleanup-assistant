import type { AiClient } from '@/ai/aiClient';
import { runAiTasks } from '@/ai/runAiTasks';
import { toTaskIssues } from '@/ai/toTaskIssues';
import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import { mergeAiIssues } from '@/engine/issues/mergeAiIssues';
import type { Truth } from '../corrupt/truth';
import type { ModelResult } from '../modelResult';
import { scoreIssues } from '../score/scoreIssues';
import type { EvalJob, EvalJobOutcome } from './evalJob';

/**
 * One analysis of the dataset with one model, as the app runs it: checks first, then the AI jobs
 * with the app's concurrency, merged the way the page merges them. A failed job adds nothing and
 * is reported; there is no retry beyond the runner's own.
 */
export async function runModelEvaluation({
  model,
  client,
  dataset,
  truth,
  datasetPath,
  checkIssues,
  jobs,
}: {
  model: string;
  client: AiClient;
  dataset: Dataset;
  truth: Truth;
  datasetPath: string;
  checkIssues: readonly Issue[];
  jobs: readonly EvalJob[];
}): Promise<ModelResult> {
  const settled: { job: EvalJob; outcome: EvalJobOutcome }[] = [];
  const startedAt = Date.now();
  await runAiTasks({
    jobs,
    signal: new AbortController().signal,
    run: async (job) => {
      settled.push({ job, outcome: await job.run({ client, model }) });
    },
  });
  const wallMs = Date.now() - startedAt;

  const aiIssues = settled.flatMap(({ outcome }) =>
    outcome.ok
      ? toTaskIssues({ taskResult: outcome.taskResult, dataset }).issues
      : []
  );
  const issues = mergeAiIssues({
    checkIssues,
    aiIssues,
    isDecided: () => false,
    isRejected: () => false,
  });
  const records = settled.flatMap(({ outcome }) => outcome.calls);

  return {
    run: 'model',
    model,
    date: new Date().toISOString().slice(0, 10),
    dataset: datasetPath,
    seed: truth.seed,
    rows: dataset.rows.length,
    issues: issues.length,
    calls: records.length,
    failedTasks: settled.flatMap(({ job, outcome }) =>
      outcome.ok ? [] : [{ task: job.task, reason: outcome.reason }]
    ),
    tokens: records.reduce((sum, { totalTokens }) => sum + totalTokens, 0),
    cost: records.reduce((sum, { cost }) => sum + (cost ?? 0), 0),
    callsWithoutCost: records.filter(({ cost }) => cost === null).length,
    wallMs,
    scores: scoreIssues({ issues, truth, dataset }),
  };
}
