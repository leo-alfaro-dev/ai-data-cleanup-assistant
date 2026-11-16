import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { toIssueId } from '@/engine/issues/toIssueId';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { expectIssueContract } from '@/engine/testing/expectIssueContract';
import { toDataset } from '@/engine/testing/toDataset';
import type { ConfirmDuplicatesResult } from './confirmDuplicatesContract';
import { toConfirmDuplicatesIssues } from './toConfirmDuplicatesIssues';

const dataset = toDataset(
  'name,email,city,phone',
  'Ada Lovelace,ada@example.com,London,',
  'Bo Ng,bo@example.com,Oslo,555-0101',
  'Ada Lovelase,,Londn,555-0102',
  'Cy Wu,cy@example.com,Rome,555-0103'
);

function result(
  duplicate: Partial<ConfirmDuplicatesResult['duplicates'][number]>
): ConfirmDuplicatesResult {
  return {
    duplicates: [
      {
        rows: [0, 2],
        confidence: 'high',
        reason: 'One person, typed twice.',
        keep: 'first',
        choices: [],
        ...duplicate,
      },
    ],
    claimCount: 1,
    droppedClaims: 0,
  };
}

describe('toConfirmDuplicatesIssues', () => {
  it('shows the reason of the model without em dashes', () => {
    const [issue] = toConfirmDuplicatesIssues({
      result: result({ reason: 'One person \u2014 typed twice.' }),
      dataset,
    });

    expect(issue?.details).toMatchObject({
      reason: 'One person, typed twice.',
    });
  });

  it('turns a confirmed pair into a duplicate issue from the AI that merges the two rows', () => {
    const issues = toConfirmDuplicatesIssues({ result: result({}), dataset });

    expect(issues).toEqual([
      {
        id: toIssueId('confirm-duplicates:0-2'),
        category: 'duplicate',
        source: 'ai',
        confidence: 'high',
        rows: [0, 2].map(toRowId),
        column: null,
        suggestion: {
          kind: 'mergeRows',
          keep: 0,
          remove: [2],
          values: [{ column: 3, from: 2 }],
        },
        details: {
          kind: 'confirmedDuplicate',
          keptRow: 0,
          reason: 'One person, typed twice.',
        },
      },
    ]);
  });

  it('keeps the row the model chose, even when it is the later one', () => {
    const [issue] = toConfirmDuplicatesIssues({
      result: result({ keep: 'second' }),
      dataset,
    });

    expect(issue?.suggestion).toMatchObject({
      kind: 'mergeRows',
      keep: 2,
      remove: [0],
    });
    expect(issue?.rows).toEqual([0, 2]);
    expect(issue?.id).toBe('confirm-duplicates:0-2');
  });

  it('takes the other row’s value for a column the model chose from it', () => {
    const [issue] = toConfirmDuplicatesIssues({
      result: result({ choices: [{ column: 2, keep: 'second' }] }),
      dataset,
    });

    expect(issue?.suggestion).toMatchObject({
      values: [
        { column: 2, from: 2 },
        { column: 3, from: 2 },
      ],
    });
  });

  it('does not take a blank value from the other row over a real one', () => {
    const [issue] = toConfirmDuplicatesIssues({
      result: result({ choices: [{ column: 1, keep: 'second' }] }),
      dataset,
    });

    expect(issue?.suggestion).toMatchObject({
      values: [{ column: 3, from: 2 }],
    });
  });

  it('keeps the kept row’s value for a column the model chose from it, and fills no blank there', () => {
    const [issue] = toConfirmDuplicatesIssues({
      result: result({ choices: [{ column: 3, keep: 'first' }] }),
      dataset,
    });

    expect(issue?.suggestion).toMatchObject({ values: [] });
  });

  it('shows the kept row with the chosen values once accepted, and removes the other row', () => {
    const issues = toConfirmDuplicatesIssues({
      result: result({ choices: [{ column: 2, keep: 'second' }] }),
      dataset,
    });

    expectIssueContract({ dataset, issues });
    expect(cleanedValues({ dataset, issues })).toEqual([
      ['Ada Lovelace', 'ada@example.com', 'Londn', '555-0102'],
      ['Bo Ng', 'bo@example.com', 'Oslo', '555-0101'],
      ['Ada Lovelase', '', 'Londn', '555-0102'],
      ['Cy Wu', 'cy@example.com', 'Rome', '555-0103'],
    ]);
  });

  it('gives nothing when no pair was confirmed', () => {
    expect(
      toConfirmDuplicatesIssues({
        result: { duplicates: [], claimCount: 0, droppedClaims: 0 },
        dataset,
      })
    ).toEqual([]);
  });
});
