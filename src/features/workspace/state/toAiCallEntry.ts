import type { AiJobOutcome } from '@/ai/aiJobOutcome';
import type { AiCallEntry } from './aiCallEntry';
import type { AiJob } from './aiJob';
import type { RunId } from './runId';

export function toAiCallEntry({
  runId,
  model,
  job,
  body,
  outcome,
  sequence,
}: {
  runId: RunId;
  model: string;
  job: AiJob;
  body: string;
  outcome: AiJobOutcome;
  sequence: number;
}): AiCallEntry {
  const base = {
    key: `${runId}:${job.key}:${sequence}`,
    runId,
    task: job.request.task,
    model,
    requestBody: body,
    records: outcome.calls,
  };

  if (!outcome.ok) {
    return {
      ...base,
      outcome: outcome.reason,
      claimCount: null,
      droppedClaims: null,
    };
  }

  const { claimCount, droppedClaims } = outcome.taskResult.result;

  return { ...base, outcome: 'ok', claimCount, droppedClaims };
}
