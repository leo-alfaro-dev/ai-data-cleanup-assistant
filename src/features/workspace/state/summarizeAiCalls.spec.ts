import { describe, expect, it } from 'vitest';
import type { AiCallRecord } from '@/ai/aiCallRecord';
import type { AiCallEntry } from './aiCallEntry';
import { toRunId } from './runId';
import { summarizeAiCalls } from './summarizeAiCalls';

function record(partial: Partial<AiCallRecord>): AiCallRecord {
  return {
    task: 'normalizeValues',
    model: 'm',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
    latencyMs: 1,
    outcome: 'valid',
    ...partial,
  };
}

function entry(partial: Partial<AiCallEntry>): AiCallEntry {
  return {
    key: 'k',
    runId: toRunId(1),
    task: 'normalizeValues',
    model: 'm',
    requestBody: '{}',
    outcome: 'ok',
    records: [],
    claimCount: 0,
    droppedClaims: 0,
    ...partial,
  };
}

describe('summarizeAiCalls', () => {
  it('adds up the calls, tokens, cost and claims of every entry', () => {
    const totals = summarizeAiCalls([
      entry({
        records: [
          record({ totalTokens: 1200, cost: 0.001, latencyMs: 2000 }),
          record({ totalTokens: 800, cost: 0.0005, latencyMs: 1500 }),
        ],
        claimCount: 14,
        droppedClaims: 2,
      }),
      entry({
        records: [record({ totalTokens: 500, cost: 0.0003, latencyMs: 500 })],
        claimCount: 6,
        droppedClaims: 0,
      }),
    ]);

    expect(totals.callCount).toBe(3);
    expect(totals.tokens).toBe(2500);
    expect(totals.latencyMs).toBe(4000);
    expect(totals.cost).toBeCloseTo(0.0018, 10);
    expect(totals).toMatchObject({ claimCount: 20, droppedClaims: 2 });
  });

  it('counts a failed call that has no claims, and a record that carries no cost, as nothing', () => {
    const totals = summarizeAiCalls([
      entry({
        outcome: 'rateLimited',
        records: [
          record({ cost: null, totalTokens: 0, outcome: 'rateLimited' }),
        ],
        claimCount: null,
        droppedClaims: null,
      }),
    ]);

    expect(totals).toEqual({
      callCount: 1,
      tokens: 0,
      cost: 0,
      latencyMs: 1,
      claimCount: 0,
      droppedClaims: 0,
    });
  });

  it('counts a request the server never answered as no call', () => {
    expect(
      summarizeAiCalls([entry({ outcome: 'unexpected', records: [] })])
        .callCount
    ).toBe(0);
  });

  it('is all zero for no entries', () => {
    expect(summarizeAiCalls([])).toEqual({
      callCount: 0,
      tokens: 0,
      cost: 0,
      latencyMs: 0,
      claimCount: 0,
      droppedClaims: 0,
    });
  });
});
