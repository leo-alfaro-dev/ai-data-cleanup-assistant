import { describe, expect, it } from 'vitest';
import { buildSummary } from './buildSummary';
import type { ChecksOnlyResult } from './checksOnlyResult';
import type { ModelResult } from './modelResult';

type Score = ChecksOnlyResult['scores']['duplicate'];

const score = (overrides: Partial<Score>): Score => ({
  planted: 10,
  claimed: 10,
  correctClaims: 10,
  found: 10,
  precision: 1,
  recall: 1,
  suggested: 4,
  rightSuggestions: 4,
  suggestionAccuracy: 1,
  ...overrides,
});

const scores = (overrides: Partial<Score>) => ({
  duplicate: score(overrides),
  inconsistent: score(overrides),
  missing: score(overrides),
  suspicious: score(overrides),
});

const checksOnly: ChecksOnlyResult = {
  run: 'checks-only',
  dataset: 'eval/datasets/customers.csv',
  seed: 7,
  rows: 100,
  issues: 5,
  scores: scores({ recall: 0.5 }),
};

const model = (overrides: Partial<ModelResult>): ModelResult => ({
  run: 'model',
  model: 'vendor/model-b',
  date: '2026-11-15',
  dataset: 'eval/datasets/customers.csv',
  seed: 7,
  rows: 100,
  issues: 9,
  calls: 6,
  failedTasks: [],
  tokens: 37000,
  cost: 0.0123,
  callsWithoutCost: 0,
  wallMs: 32600,
  scores: scores({ precision: 0.9, recall: 0.8 }),
  ...overrides,
});

describe('buildSummary', () => {
  it('puts the checks first, then each model by id, with cost and time', () => {
    const summary = buildSummary({
      checksOnly,
      models: [
        model({ model: 'vendor/model-b' }),
        model({ model: 'vendor/model-a', cost: 0.5, wallMs: 1500 }),
      ],
    });

    const lines = summary.split('\n').filter((line) => line.startsWith('| '));
    expect(lines[0]).toContain('Duplicates');
    expect(lines[2]).toBe(
      '| Checks only | P 100.0% · R 50.0% | P 100.0% · R 50.0% | P 100.0% · R 50.0% | P 100.0% · R 50.0% | 100.0% | $0 | n/a |'
    );
    expect(lines[3]).toContain('| vendor/model-a |');
    expect(lines[3]).toContain('P 90.0% · R 80.0%');
    expect(lines[3]).toContain('| $0.5000 | 1.5 s |');
    expect(lines[4]).toContain('| vendor/model-b |');
  });

  it('shows a ratio over nothing as n/a, and pools the suggestion accuracy', () => {
    const summary = buildSummary({
      checksOnly,
      models: [
        model({
          scores: {
            ...scores({}),
            duplicate: score({ precision: null, recall: null }),
            missing: score({ suggested: 6, rightSuggestions: 3 }),
          },
        }),
      ],
    });

    expect(summary).toContain('P n/a · R n/a');
    expect(summary).toContain('83.3%');
  });

  it('lists failed tasks and calls without a cost in the runs table', () => {
    const summary = buildSummary({
      checksOnly,
      models: [
        model({
          failedTasks: [{ task: 'confirmDuplicates', reason: 'timeout' }],
          callsWithoutCost: 2,
        }),
      ],
    });

    expect(summary).toContain(
      '| vendor/model-b | 2026-11-15 | 6 | 37,000 | confirmDuplicates: timeout; 2 calls without a cost |'
    );
    expect(summary).toContain('| ≥ $0.0123 |');
  });
});
