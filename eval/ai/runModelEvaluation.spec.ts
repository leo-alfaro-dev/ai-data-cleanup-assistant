import { describe, expect, it } from 'vitest';
import type { AiCallRecord } from '@/ai/aiCallRecord';
import { createFakeAiClient } from '@/ai/testing/fakeAiClient';
import { toDataset } from '@/engine/testing/toDataset';
import { truthSchema } from '../corrupt/truth';
import type { EvalJob } from './evalJob';
import { runModelEvaluation } from './runModelEvaluation';

const dataset = toDataset('name,state', 'Ann,California', 'Bob,Calif.');

const truth = truthSchema.parse({
  seed: 5,
  errors: [
    {
      category: 'inconsistent',
      kind: 'stateVariant',
      rowId: 1,
      column: 1,
      cleanValue: 'California',
      corruptedValue: 'Calif.',
    },
  ],
});

const record = (overrides: Partial<AiCallRecord>): AiCallRecord => ({
  task: 'normalizeValues',
  model: 'test/model',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.001,
  latencyMs: 20,
  outcome: 'valid',
  ...overrides,
});

const succeeding: EvalJob = {
  task: 'normalizeValues',
  messages: [],
  maxTokens: 1,
  replySchemaCharacters: 0,
  run: async () => ({
    ok: true,
    taskResult: {
      task: 'normalizeValues',
      result: {
        column: { key: 1, header: 'state', dominantType: 'text' },
        groups: [
          {
            canonical: 'California',
            isCanonicalInFile: true,
            variants: ['Calif.'],
            reason: 'The same state.',
            confidence: 'high',
          },
        ],
        placeholders: [],
        claimCount: 2,
        droppedClaims: 0,
      },
    },
    calls: [
      record({ outcome: 'invalidModelOutput', cost: 0.002 }),
      record({ cost: 0.004 }),
    ],
  }),
};

const failing: EvalJob = {
  task: 'confirmDuplicates',
  messages: [],
  maxTokens: 1,
  replySchemaCharacters: 0,
  run: async () => ({
    ok: false,
    reason: 'timeout',
    calls: [
      record({
        task: 'confirmDuplicates',
        outcome: 'timeout',
        cost: null,
        totalTokens: 0,
      }),
    ],
  }),
};

const evaluate = (jobs: readonly EvalJob[]) =>
  runModelEvaluation({
    model: 'test/model',
    client: createFakeAiClient().client,
    dataset,
    truth,
    datasetPath: 'eval/datasets/test.csv',
    checkIssues: [],
    jobs,
  });

describe('runModelEvaluation', () => {
  it('adds up every call, a retry included, and the tokens and cost with them', async () => {
    const result = await evaluate([succeeding]);

    expect(result).toMatchObject({
      model: 'test/model',
      seed: 5,
      rows: 2,
      calls: 2,
      tokens: 30,
      callsWithoutCost: 0,
      failedTasks: [],
    });
    expect(result.cost).toBeCloseTo(0.006, 10);
  });

  it('scores the issues the AI results make against the truth', async () => {
    const result = await evaluate([succeeding]);

    expect(result.issues).toBe(1);
    expect(result.scores.inconsistent).toMatchObject({
      planted: 1,
      found: 1,
      recall: 1,
      precision: 1,
    });
  });

  it('reports a failed job with its reason, counts its call without a cost, and adds no issue', async () => {
    const result = await evaluate([failing]);

    expect(result.failedTasks).toEqual([
      { task: 'confirmDuplicates', reason: 'timeout' },
    ]);
    expect(result).toMatchObject({
      calls: 1,
      callsWithoutCost: 1,
      cost: 0,
      issues: 0,
    });
    expect(result.scores.inconsistent.recall).toBe(0);
  });
});
