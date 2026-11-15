import { z } from 'zod';
import type { AiTaskOutcome } from '@/ai/aiTaskOutcome';
import type { AiTaskResult } from '@/ai/aiTaskResult';
import {
  MAX_REPLY_TOKENS as ASSESS_MAX_REPLY_TOKENS,
  assessSuspiciousRowsReply,
} from '@/ai/tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import { buildAssessSuspiciousRowsPrompt } from '@/ai/tasks/assessSuspiciousRows/buildAssessSuspiciousRowsPrompt';
import { buildAssessSuspiciousRowsRequests } from '@/ai/tasks/assessSuspiciousRows/buildAssessSuspiciousRowsRequests';
import { runAssessSuspiciousRows } from '@/ai/tasks/assessSuspiciousRows/runAssessSuspiciousRows';
import {
  MAX_REPLY_TOKENS as CONFIRM_MAX_REPLY_TOKENS,
  confirmDuplicatesReply,
} from '@/ai/tasks/confirmDuplicates/confirmDuplicatesContract';
import { buildConfirmDuplicatesPrompt } from '@/ai/tasks/confirmDuplicates/buildConfirmDuplicatesPrompt';
import { buildConfirmDuplicatesRequests } from '@/ai/tasks/confirmDuplicates/buildConfirmDuplicatesRequests';
import { runConfirmDuplicates } from '@/ai/tasks/confirmDuplicates/runConfirmDuplicates';
import {
  MAX_REPLY_TOKENS as NORMALIZE_MAX_REPLY_TOKENS,
  normalizeValuesReply,
} from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import { buildNormalizeValuesPrompt } from '@/ai/tasks/normalizeValues/buildNormalizeValuesPrompt';
import { buildNormalizeValuesRequests } from '@/ai/tasks/normalizeValues/buildNormalizeValuesRequests';
import { runNormalizeValues } from '@/ai/tasks/normalizeValues/runNormalizeValues';
import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import { findNearDuplicateCandidates } from '@/engine/matching/findNearDuplicateCandidates';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import type { EvalJob, EvalJobOutcome } from './evalJob';

/** The same requests the app sends for the file, one job per request. */
export function buildEvalJobs({
  dataset,
  profile,
  checkIssues,
}: {
  dataset: Dataset;
  profile: readonly ColumnProfile[];
  checkIssues: readonly Issue[];
}): EvalJob[] {
  const normalizeJobs = buildNormalizeValuesRequests({
    profile,
    headers: dataset.columns.map(({ header }) => header),
    rowCount: dataset.rows.length,
  }).map((request): EvalJob => ({
    task: 'normalizeValues',
    messages: buildNormalizeValuesPrompt(request),
    maxTokens: NORMALIZE_MAX_REPLY_TOKENS,
    replySchemaCharacters: measureSchema(normalizeValuesReply),
    run: async ({ client, model }) =>
      toJobOutcome({
        outcome: await runNormalizeValues({ client, model, request }),
        toTaskResult: (result) => ({ task: 'normalizeValues', result }),
      }),
  }));
  const confirmJobs = buildConfirmDuplicatesRequests({
    dataset,
    candidates: findNearDuplicateCandidates({ dataset, profile }),
  }).map((request): EvalJob => ({
    task: 'confirmDuplicates',
    messages: buildConfirmDuplicatesPrompt(request),
    maxTokens: CONFIRM_MAX_REPLY_TOKENS,
    replySchemaCharacters: measureSchema(confirmDuplicatesReply),
    run: async ({ client, model }) =>
      toJobOutcome({
        outcome: await runConfirmDuplicates({ client, model, request }),
        toTaskResult: (result) => ({ task: 'confirmDuplicates', result }),
      }),
  }));
  const assessJobs = buildAssessSuspiciousRowsRequests({
    dataset,
    profile,
    issues: checkIssues,
  }).map((request): EvalJob => ({
    task: 'assessSuspiciousRows',
    messages: buildAssessSuspiciousRowsPrompt(request),
    maxTokens: ASSESS_MAX_REPLY_TOKENS,
    replySchemaCharacters: measureSchema(assessSuspiciousRowsReply),
    run: async ({ client, model }) =>
      toJobOutcome({
        outcome: await runAssessSuspiciousRows({ client, model, request }),
        toTaskResult: (result) => ({ task: 'assessSuspiciousRows', result }),
      }),
  }));

  return [...normalizeJobs, ...confirmJobs, ...assessJobs];
}

function toJobOutcome<Result>({
  outcome,
  toTaskResult,
}: {
  outcome: AiTaskOutcome<Result>;
  toTaskResult: (result: Result) => AiTaskResult;
}): EvalJobOutcome {
  if (!outcome.ok) return outcome;

  return {
    ok: true,
    taskResult: toTaskResult(outcome.result),
    calls: outcome.calls,
  };
}

function measureSchema(schema: z.ZodType): number {
  return JSON.stringify(z.toJSONSchema(schema)).length;
}
