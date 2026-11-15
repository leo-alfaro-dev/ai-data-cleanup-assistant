import type { AiCallEntry } from './aiCallEntry';

export type AiCallTotals = {
  callCount: number;
  tokens: number;
  cost: number;
  latencyMs: number;
  claimCount: number;
  droppedClaims: number;
};

// Every model call the server recorded, the retry for an invalid reply included.
export function summarizeAiCalls(
  entries: readonly AiCallEntry[]
): AiCallTotals {
  const records = entries.flatMap(({ records: recorded }) => recorded);

  return {
    callCount: records.length,
    tokens: records.reduce((sum, { totalTokens }) => sum + totalTokens, 0),
    cost: records.reduce((sum, { cost }) => sum + (cost ?? 0), 0),
    latencyMs: records.reduce((sum, { latencyMs }) => sum + latencyMs, 0),
    claimCount: entries.reduce(
      (sum, { claimCount }) => sum + (claimCount ?? 0),
      0
    ),
    droppedClaims: entries.reduce(
      (sum, { droppedClaims }) => sum + (droppedClaims ?? 0),
      0
    ),
  };
}
