import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { toIssueId } from '@/engine/issues/toIssueId';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { expectIssueContract } from '@/engine/testing/expectIssueContract';
import { toDataset } from '@/engine/testing/toDataset';
import type { AssessSuspiciousRowsResult } from './assessSuspiciousRowsContract';
import { toAssessSuspiciousRowsIssues } from './toAssessSuspiciousRowsIssues';

const dataset = toDataset(
  'name,email,amount',
  'Ada,ada@example.com,12',
  'Bo,bo.example.com,9999999',
  'Cy,cy@example.com,14',
  'Di,di@example.com,13'
);

type Verdict = AssessSuspiciousRowsResult['rows'][number];

function result(...rows: Partial<Verdict>[]): AssessSuspiciousRowsResult {
  return {
    rows: rows.map((row): Verdict => ({
      rowId: 0,
      flaggedBy: [],
      isSuspicious: true,
      column: null,
      reason: 'Looks wrong.',
      confidence: 'high',
      suggestedValue: null,
      ...row,
    })),
    claimCount: rows.length,
    droppedClaims: 0,
  };
}

describe('toAssessSuspiciousRowsIssues', () => {
  it('turns a sampled row the model finds suspicious into a new suspicious issue from the AI', () => {
    const { issues, notes } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result({
        rowId: 3,
        column: 2,
        reason: 'An amount that small is odd.',
      }),
    });

    expect(notes).toEqual([]);
    expect(issues).toEqual([
      {
        id: toIssueId('assess-suspicious-rows:3'),
        category: 'suspicious',
        source: 'ai',
        confidence: 'high',
        rows: [toRowId(3)],
        column: 2,
        suggestion: null,
        details: {
          kind: 'assessedRow',
          reason: 'An amount that small is odd.',
        },
      },
    ]);
  });

  it('suggests the cell value only when the model gave one for a cell that exists', () => {
    const { issues } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result(
        { rowId: 1, column: 1, suggestedValue: 'bo@example.com' },
        { rowId: 2, column: 9, suggestedValue: 'x' }
      ),
    });

    expect(issues[0]?.suggestion).toEqual({
      kind: 'setCells',
      cells: [{ rowId: 1, column: 1, value: 'bo@example.com' }],
    });
    expect(issues[1]?.suggestion).toBeNull();
    expectIssueContract({ dataset, issues });
    expect(cleanedValues({ dataset, issues })[1]).toEqual([
      'Bo',
      'bo@example.com',
      '9999999',
    ]);
  });

  it('gives a row the model finds plausible no issue at all', () => {
    const { issues, notes } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result({ rowId: 2, isSuspicious: false, reason: 'Ordinary.' }),
    });

    expect(issues).toEqual([]);
    expect(notes).toEqual([]);
  });

  it('keeps the check issue of a flagged row and adds a note for each issue that flagged it', () => {
    const { issues, notes } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result({
        rowId: 1,
        flaggedBy: ['numeric-outliers:2', 'invalid-emails:1'],
        column: 2,
        reason: 'Far above every other amount.',
        suggestedValue: '99.99',
      }),
    });

    expect(issues).toEqual([]);
    expect(notes).toEqual([
      {
        issueId: 'numeric-outliers:2',
        rowId: 1,
        isSuspicious: true,
        column: 2,
        reason: 'Far above every other amount.',
        confidence: 'high',
        suggestedValue: '99.99',
      },
      {
        issueId: 'invalid-emails:1',
        rowId: 1,
        isSuspicious: true,
        column: 2,
        reason: 'Far above every other amount.',
        confidence: 'high',
        suggestedValue: '99.99',
      },
    ]);
  });

  it('shows the reason of the model without em dashes, in an issue and in a note', () => {
    const { issues, notes } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result(
        { rowId: 3, column: 2, reason: 'Too small \u2014 odd for this file.' },
        {
          rowId: 1,
          flaggedBy: ['invalid-emails:1'],
          reason: 'No @ \u2014 not an email.',
        }
      ),
    });

    expect(issues[0]?.details).toEqual({
      kind: 'assessedRow',
      reason: 'Too small, odd for this file.',
    });
    expect(notes[0]?.reason).toBe('No @, not an email.');
  });

  it('adds a note for a flagged row the model finds plausible, so the issue can say so', () => {
    const { notes } = toAssessSuspiciousRowsIssues({
      dataset,
      result: result({
        rowId: 2,
        flaggedBy: ['numeric-outliers:2'],
        isSuspicious: false,
        reason: 'A large order, but plausible for this plan.',
      }),
    });

    expect(notes).toMatchObject([{ isSuspicious: false, column: null }]);
  });

  it('gives nothing for an empty result', () => {
    expect(toAssessSuspiciousRowsIssues({ dataset, result: result() })).toEqual(
      {
        issues: [],
        notes: [],
      }
    );
  });
});
