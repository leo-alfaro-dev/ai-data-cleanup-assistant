import { z } from 'zod';
import type { AiClientFailure } from './aiClientFailure';
import type { AiFailureReason } from './aiFailureReason';

// An aborted call has no reason: the caller stops asking.
export function toAiFailureReason(
  failure: Exclude<AiClientFailure, { kind: 'aborted' }>
): AiFailureReason {
  switch (failure.kind) {
    case 'timeout':
      return 'timeout';
    case 'network':
      return 'unexpected';
    case 'http':
      return fromStatus(failure);
  }
}

const budgetPayload = z.object({
  error: z.object({
    metadata: z.object({ limit_source: z.string() }),
  }),
});

// A spent key or workspace limit is a 403 with its source named; any other 403 is a guardrail.
function fromStatus({
  status,
  payload,
}: {
  status: number;
  payload: unknown;
}): AiFailureReason {
  if (status === 401) return 'invalidKey';
  if (status === 402) return 'budgetExhausted';
  if (status === 403) {
    const isBudget = budgetPayload.safeParse(payload).success;

    return isBudget ? 'budgetExhausted' : 'unexpected';
  }
  if (status === 408) return 'timeout';
  if (status === 429) return 'providerRateLimited';
  if (status === 404 || status === 502 || status === 503) {
    return 'modelUnavailable';
  }

  return 'unexpected';
}
