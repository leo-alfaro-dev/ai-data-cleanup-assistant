import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { IssueCategory } from '@/engine/issues/issue';
import { toDataset } from '@/engine/testing/toDataset';
import { truthSchema } from '../corrupt/truth';
import { scoreIssues } from './scoreIssues';
import type { ScoredIssue } from './scoredIssue';

const STATE = toColumnKey(1);
const SPEND = toColumnKey(2);

// Rows 5 and 6 both copy row 0; row 6 is a near copy with its state blanked.
const roster = toDataset(
  'name,state,spend',
  'Ann,California,10',
  'Bob,Calif.,20',
  'Cy,N/A,30',
  'Di,Texas,3000',
  'Ed,tx,40',
  'Ann,California,10',
  'Ann,,10',
  'Gus,Texas,70'
);

const truth = truthSchema.parse({
  seed: 1,
  errors: [
    {
      category: 'inconsistent',
      kind: 'stateVariant',
      rowId: 1,
      column: 1,
      cleanValue: 'California',
      corruptedValue: 'Calif.',
    },
    {
      category: 'inconsistent',
      kind: 'casing',
      rowId: 4,
      column: 1,
      cleanValue: 'Texas',
      corruptedValue: 'tx',
    },
    {
      category: 'missing',
      kind: 'placeholder',
      rowId: 2,
      column: 1,
      cleanValue: 'Texas',
      corruptedValue: 'N/A',
    },
    {
      category: 'suspicious',
      kind: 'spendTimes100',
      rowId: 3,
      column: 2,
      cleanValue: '30',
      corruptedValue: '3000',
    },
    { category: 'duplicate', kind: 'exactCopy', original: 0, copy: 5 },
    { category: 'duplicate', kind: 'blankedField', original: 0, copy: 6 },
  ],
});

describe('scoreIssues, claims', () => {
  it('scores a perfect match as precision 1 and recall 1 in every category', () => {
    const scores = score([
      issue({ category: 'inconsistent', rows: [1, 4], column: STATE }),
      issue({ category: 'missing', rows: [2], column: STATE }),
      issue({ category: 'suspicious', rows: [3], column: SPEND }),
      issue({ category: 'duplicate', rows: [0, 5, 6] }),
    ]);

    expect(scores.inconsistent).toMatchObject({
      planted: 2,
      claimed: 2,
      correctClaims: 2,
      found: 2,
      precision: 1,
      recall: 1,
    });
    expect(scores.missing).toMatchObject({ precision: 1, recall: 1 });
    expect(scores.suspicious).toMatchObject({ precision: 1, recall: 1 });
    expect(scores.duplicate).toMatchObject({
      planted: 3,
      claimed: 3,
      correctClaims: 3,
      found: 3,
      precision: 1,
      recall: 1,
    });
  });

  it('lowers precision only for a false alarm', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1, 4, 7], column: STATE }),
    ]);

    expect(inconsistent).toMatchObject({
      claimed: 3,
      correctClaims: 2,
      found: 2,
      recall: 1,
    });
    expect(inconsistent.precision).toBeCloseTo(2 / 3);
  });

  it('lowers recall only for a miss', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1], column: STATE }),
    ]);

    expect(inconsistent).toMatchObject({
      claimed: 1,
      correctClaims: 1,
      found: 1,
      precision: 1,
      recall: 0.5,
    });
  });

  it('does not count the right cell in the wrong category', () => {
    const scores = score([
      issue({ category: 'missing', rows: [1], column: STATE }),
    ]);

    expect(scores.missing).toMatchObject({
      planted: 1,
      claimed: 1,
      correctClaims: 0,
      found: 0,
      precision: 0,
      recall: 0,
    });
    expect(scores.inconsistent).toMatchObject({
      planted: 2,
      claimed: 0,
      found: 0,
      precision: null,
      recall: 0,
    });
  });

  it('does not count the right row in the wrong column', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1], column: SPEND }),
    ]);

    expect(inconsistent).toMatchObject({
      claimed: 1,
      correctClaims: 0,
      found: 0,
    });
  });

  it('lets a whole-row claim cover the planted cells of its row', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1, 4] }),
    ]);

    expect(inconsistent).toMatchObject({
      claimed: 2,
      correctClaims: 2,
      found: 2,
      precision: 1,
      recall: 1,
    });
  });

  it('counts a whole-row claim on a row with no planted error of its category as a false alarm', () => {
    const scores = score([
      issue({ category: 'inconsistent', rows: [7] }),
      issue({ category: 'missing', rows: [1] }),
    ]);

    expect(scores.inconsistent).toMatchObject({
      claimed: 1,
      correctClaims: 0,
      found: 0,
    });
    expect(scores.missing).toMatchObject({
      claimed: 1,
      correctClaims: 0,
      found: 0,
    });
  });

  it('counts a cell claimed by several issues once', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1, 1], column: STATE }),
      issue({ category: 'inconsistent', rows: [1, 4], column: STATE }),
    ]);

    expect(inconsistent).toMatchObject({
      claimed: 2,
      correctClaims: 2,
      found: 2,
    });
  });

  it('counts a duplicate row claimed by several issues once', () => {
    const { duplicate } = score([
      issue({ category: 'duplicate', rows: [0, 5] }),
      issue({ category: 'duplicate', rows: [5, 0] }),
    ]);

    expect(duplicate).toMatchObject({ claimed: 2, correctClaims: 2, found: 2 });
  });

  it('counts an original copied twice as one planted row', () => {
    const { duplicate } = score([issue({ category: 'duplicate', rows: [5] })]);

    expect(duplicate).toMatchObject({
      planted: 3,
      claimed: 1,
      correctClaims: 1,
      found: 1,
      precision: 1,
    });
    expect(duplicate.recall).toBeCloseTo(1 / 3);
  });

  it('counts a duplicate claim on a row that is no duplicate as a false alarm', () => {
    const { duplicate } = score([
      issue({ category: 'duplicate', rows: [0, 5, 6, 7] }),
    ]);

    expect(duplicate).toMatchObject({
      claimed: 4,
      correctClaims: 3,
      found: 3,
      recall: 1,
    });
    expect(duplicate.precision).toBeCloseTo(3 / 4);
  });
});

describe('scoreIssues, copy rows', () => {
  it('leaves claims inside a planted copy out of the score', () => {
    const { missing } = score([
      issue({ category: 'missing', rows: [6], column: STATE }),
      issue({ category: 'missing', rows: [6] }),
    ]);

    expect(missing).toMatchObject({
      claimed: 0,
      correctClaims: 0,
      precision: null,
    });
  });

  it('scores a claim on the original of a copy like any other row', () => {
    const { missing } = score([
      issue({ category: 'missing', rows: [0], column: STATE }),
    ]);

    expect(missing).toMatchObject({ claimed: 1, correctClaims: 0 });
  });

  it('keeps the claims of an issue on rows outside the copies', () => {
    const { missing } = score([
      issue({ category: 'missing', rows: [2, 6], column: STATE }),
    ]);

    expect(missing).toMatchObject({
      claimed: 1,
      correctClaims: 1,
      found: 1,
      precision: 1,
      recall: 1,
    });
  });

  it('leaves cells a suggestion changes inside a planted copy out of the score', () => {
    const { missing } = score([
      issue({
        category: 'missing',
        rows: [6],
        column: STATE,
        suggestion: setState({ rowId: 6, value: 'California' }),
      }),
    ]);

    expect(missing).toMatchObject({ suggested: 0, suggestionAccuracy: null });
  });

  it('still counts the copy as a duplicate claim', () => {
    const { duplicate } = score([issue({ category: 'duplicate', rows: [6] })]);

    expect(duplicate).toMatchObject({ claimed: 1, correctClaims: 1, found: 1 });
  });
});

describe('scoreIssues, suggestions for value categories', () => {
  it('counts a cell changed to its clean value as right', () => {
    const { inconsistent } = score([
      issue({
        category: 'inconsistent',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Calif.', to: 'California' }),
      }),
    ]);

    expect(inconsistent).toMatchObject({
      suggested: 1,
      rightSuggestions: 1,
      suggestionAccuracy: 1,
    });
  });

  it('counts a cell changed to another value as wrong', () => {
    const { inconsistent } = score([
      issue({
        category: 'inconsistent',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Calif.', to: 'CA' }),
      }),
    ]);

    expect(inconsistent).toMatchObject({
      suggested: 1,
      rightSuggestions: 0,
      suggestionAccuracy: 0,
    });
  });

  it('counts a change to a clean cell as wrong', () => {
    const { inconsistent } = score([
      issue({
        category: 'inconsistent',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Texas', to: 'TX' }),
      }),
    ]);

    expect(inconsistent).toMatchObject({
      suggested: 2,
      rightSuggestions: 0,
      suggestionAccuracy: 0,
    });
  });

  it('counts a blank for a planted placeholder as right, and any other value that is not its clean value as wrong', () => {
    const emptied = score([
      issue({
        category: 'missing',
        rows: [2],
        column: STATE,
        suggestion: mapState({ from: 'N/A', to: '' }),
      }),
    ]);
    const renamed = score([
      issue({
        category: 'missing',
        rows: [2],
        column: STATE,
        suggestion: mapState({ from: 'N/A', to: 'unknown' }),
      }),
    ]);

    expect(emptied.missing).toMatchObject({
      suggested: 1,
      rightSuggestions: 1,
    });
    expect(renamed.missing).toMatchObject({
      suggested: 1,
      rightSuggestions: 0,
    });
  });

  it('does not count a blank as right for a planted error that is not missing data', () => {
    const { inconsistent } = score([
      issue({
        category: 'inconsistent',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Calif.', to: '' }),
      }),
    ]);

    expect(inconsistent).toMatchObject({ suggested: 1, rightSuggestions: 0 });
  });

  it('judges a cell by its clean value whatever category planted it', () => {
    const { missing } = score([
      issue({
        category: 'missing',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Calif.', to: 'California' }),
      }),
    ]);

    expect(missing).toMatchObject({ suggested: 1, rightSuggestions: 1 });
  });

  it('scores each suggestion alone and adds up the cells of every issue', () => {
    const { inconsistent } = score([
      issue({
        category: 'inconsistent',
        rows: [1],
        column: STATE,
        suggestion: mapState({ from: 'Calif.', to: 'California' }),
      }),
      issue({
        category: 'inconsistent',
        rows: [4],
        column: STATE,
        suggestion: mapState({ from: 'tx', to: 'TX' }),
      }),
    ]);

    expect(inconsistent).toMatchObject({
      suggested: 2,
      rightSuggestions: 1,
      suggestionAccuracy: 0.5,
    });
  });

  it('does not score the rows a value issue removes', () => {
    const scores = score([
      issue({
        category: 'inconsistent',
        rows: [7],
        suggestion: { kind: 'removeRows', rows: [toRowId(7)] },
      }),
    ]);

    expect(scores.inconsistent).toMatchObject({ suggested: 0 });
    expect(scores.duplicate).toMatchObject({ suggested: 0 });
  });

  it('leaves an issue without a suggestion out of the accuracy', () => {
    const { inconsistent } = score([
      issue({ category: 'inconsistent', rows: [1], column: STATE }),
    ]);

    expect(inconsistent).toMatchObject({
      suggested: 0,
      rightSuggestions: 0,
      suggestionAccuracy: null,
    });
  });
});

describe('scoreIssues, suggestions for duplicates', () => {
  it('counts the removal of a planted copy as right', () => {
    const { duplicate } = score([
      issue({
        category: 'duplicate',
        rows: [0, 5],
        suggestion: {
          kind: 'dropDuplicateRows',
          mode: 'exact',
          groups: [[toRowId(0), toRowId(5)]],
        },
      }),
    ]);

    expect(duplicate).toMatchObject({
      suggested: 1,
      rightSuggestions: 1,
      suggestionAccuracy: 1,
    });
  });

  it('counts the removal of the original as wrong', () => {
    const { duplicate } = score([
      issue({
        category: 'duplicate',
        rows: [0, 5],
        suggestion: {
          kind: 'mergeRows',
          keep: toRowId(5),
          remove: [toRowId(0)],
          values: [],
        },
      }),
    ]);

    expect(duplicate).toMatchObject({
      suggested: 1,
      rightSuggestions: 0,
      suggestionAccuracy: 0,
    });
  });

  it('counts the removal of a row that is no duplicate as wrong', () => {
    const { duplicate } = score([
      issue({
        category: 'duplicate',
        rows: [7],
        suggestion: { kind: 'removeRows', rows: [toRowId(7), toRowId(5)] },
      }),
    ]);

    expect(duplicate).toMatchObject({ suggested: 2, rightSuggestions: 1 });
  });

  it('scores only the removals of a merge, not the cells it fills', () => {
    const { duplicate } = score([
      issue({
        category: 'duplicate',
        rows: [0, 6],
        suggestion: {
          kind: 'mergeRows',
          keep: toRowId(0),
          remove: [toRowId(6)],
          values: [{ column: STATE, from: toRowId(6) }],
        },
      }),
    ]);

    expect(duplicate).toMatchObject({ suggested: 1, rightSuggestions: 1 });
  });
});

describe('scoreIssues, ratios over nothing', () => {
  it('reports recall 0 and no precision or accuracy when nothing is found', () => {
    const scores = score([]);

    for (const category of ['inconsistent', 'missing', 'suspicious'] as const) {
      expect(scores[category]).toMatchObject({
        claimed: 0,
        found: 0,
        precision: null,
        recall: 0,
        suggested: 0,
        suggestionAccuracy: null,
      });
    }
    expect(scores.duplicate).toMatchObject({
      planted: 3,
      precision: null,
      recall: 0,
    });
  });

  it('reports precision 0, and no recall, when claims meet nothing planted', () => {
    const scores = scoreIssues({
      issues: [issue({ category: 'suspicious', rows: [3], column: SPEND })],
      truth: truthSchema.parse({ seed: 1, errors: [] }),
      dataset: roster,
    });

    expect(scores.suspicious).toMatchObject({
      planted: 0,
      claimed: 1,
      correctClaims: 0,
      precision: 0,
      recall: null,
    });
  });

  it('reports every ratio as null when there is no truth and no issue', () => {
    const scores = scoreIssues({
      issues: [],
      truth: truthSchema.parse({ seed: 1, errors: [] }),
      dataset: roster,
    });

    for (const categoryScore of Object.values(scores)) {
      expect(categoryScore).toEqual({
        planted: 0,
        claimed: 0,
        correctClaims: 0,
        found: 0,
        precision: null,
        recall: null,
        suggested: 0,
        rightSuggestions: 0,
        suggestionAccuracy: null,
      });
    }
  });
});

function score(issues: ScoredIssue[]) {
  return scoreIssues({ issues, truth, dataset: roster });
}

function issue({
  category,
  rows,
  column = null,
  suggestion = null,
}: {
  category: IssueCategory;
  rows: number[];
  column?: ColumnKey | null;
  suggestion?: Change | null;
}): ScoredIssue {
  return { category, rows: rows.map(toRowId), column, suggestion };
}

function mapState({ from, to }: { from: string; to: string }): Change {
  return {
    kind: 'mapValues',
    column: STATE,
    groups: [{ canonical: to, variants: [from] }],
  };
}

function setState({ rowId, value }: { rowId: number; value: string }): Change {
  return {
    kind: 'setCells',
    cells: [{ rowId: toRowId(rowId), column: STATE, value }],
  };
}
