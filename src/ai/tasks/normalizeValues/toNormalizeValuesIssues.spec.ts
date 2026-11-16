import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { toIssueId } from '@/engine/issues/toIssueId';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { expectIssueContract } from '@/engine/testing/expectIssueContract';
import { toDataset } from '@/engine/testing/toDataset';
import type { NormalizeValuesResult } from './normalizeValuesContract';
import { toNormalizeValuesIssues } from './toNormalizeValuesIssues';

const dataset = toDataset(
  'id,state',
  '1,CA',
  '2,Calif.',
  '3,TX',
  '4,California',
  '5,  Calif.  ',
  '6,pending',
  '7,CA',
  '8,no data'
);

function result(
  partial: Partial<NormalizeValuesResult>
): NormalizeValuesResult {
  return {
    column: { key: 1, header: 'state', dominantType: 'text' },
    groups: [],
    placeholders: [],
    claimCount: 0,
    droppedClaims: 0,
    ...partial,
  };
}

describe('toNormalizeValuesIssues', () => {
  it('turns a group into an inconsistent-values issue from the AI that maps its variants', () => {
    const issues = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'California',
            isCanonicalInFile: true,
            variants: ['CA', 'Calif.'],
            reason: 'All name California.',
            confidence: 'high',
          },
        ],
      }),
    });

    expect(issues).toEqual([
      {
        id: toIssueId('normalize-values:1:0'),
        category: 'inconsistent',
        source: 'ai',
        confidence: 'high',
        rows: [0, 1, 4, 6].map(toRowId),
        column: 1,
        suggestion: {
          kind: 'mapValues',
          column: 1,
          groups: [{ canonical: 'California', variants: ['CA', 'Calif.'] }],
        },
        details: {
          kind: 'normalizedSpellings',
          canonical: 'California',
          isCanonicalInFile: true,
          variants: [
            { value: 'CA', count: 2 },
            { value: 'Calif.', count: 2 },
          ],
          reason: 'All name California.',
        },
      },
    ]);
  });

  it('keeps the rows of the file, in order, for variants found by their normalized form', () => {
    const [issue] = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'CA',
            isCanonicalInFile: true,
            variants: ['Calif.', 'California'],
            reason: 'Same state.',
            confidence: 'medium',
          },
        ],
      }),
    });

    expect(issue?.rows).toEqual([1, 3, 4].map(toRowId));
  });

  it('turns the placeholders into one missing-data issue that empties them', () => {
    const issues = toNormalizeValuesIssues({
      dataset,
      result: result({
        placeholders: [
          { value: 'pending', reason: 'To be decided.', confidence: 'high' },
          {
            value: 'no data',
            reason: 'Says there is none.',
            confidence: 'low',
          },
        ],
      }),
    });

    expect(issues).toEqual([
      {
        id: toIssueId('normalize-values:1:placeholders'),
        category: 'missing',
        source: 'ai',
        confidence: 'low',
        rows: [5, 7].map(toRowId),
        column: 1,
        suggestion: {
          kind: 'mapValues',
          column: 1,
          groups: [{ canonical: '', variants: ['pending', 'no data'] }],
        },
        details: {
          kind: 'aiPlaceholders',
          placeholders: [
            { value: 'pending', reason: 'To be decided.', count: 1 },
            { value: 'no data', reason: 'Says there is none.', count: 1 },
          ],
        },
      },
    ]);
  });

  it('shows the reasons of the model without em dashes and leaves the values alone', () => {
    const [group, placeholders] = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'California',
            isCanonicalInFile: true,
            variants: ['CA', 'Calif.'],
            reason: 'All name California \u2014 one is abbreviated.',
            confidence: 'high',
          },
        ],
        placeholders: [
          {
            value: 'pending',
            reason: 'Not a state \u2014 a status.',
            confidence: 'high',
          },
        ],
      }),
    });

    expect(group?.details).toMatchObject({
      reason: 'All name California, one is abbreviated.',
      canonical: 'California',
    });
    expect(placeholders?.details).toMatchObject({
      placeholders: [
        { value: 'pending', reason: 'Not a state, a status.', count: 1 },
      ],
    });
  });

  it('gives each issue an id of its own and satisfies the issue contract', () => {
    const issues = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'California',
            isCanonicalInFile: true,
            variants: ['CA', 'Calif.'],
            reason: 'a',
            confidence: 'high',
          },
        ],
        placeholders: [{ value: 'pending', reason: 'b', confidence: 'high' }],
      }),
    });

    expectIssueContract({ dataset, issues });
    expect(issues.map(({ id }) => id)).toEqual([
      'normalize-values:1:0',
      'normalize-values:1:placeholders',
    ]);
  });

  it('shows the mapped and the emptied values once the suggestions are accepted', () => {
    const issues = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'California',
            isCanonicalInFile: true,
            variants: ['CA', 'Calif.'],
            reason: 'a',
            confidence: 'high',
          },
        ],
        placeholders: [{ value: 'pending', reason: 'b', confidence: 'high' }],
      }),
    });

    expect(cleanedValues({ dataset, issues }).map((row) => row[1])).toEqual([
      'California',
      'California',
      'TX',
      'California',
      'California',
      '',
      'California',
      'no data',
    ]);
  });

  it('gives no issue for a group or placeholder whose values are not in the file any more', () => {
    const issues = toNormalizeValuesIssues({
      dataset,
      result: result({
        groups: [
          {
            canonical: 'Texas',
            isCanonicalInFile: false,
            variants: ['Tex.', 'TX.'],
            reason: 'a',
            confidence: 'low',
          },
        ],
        placeholders: [{ value: 'unknown', reason: 'b', confidence: 'high' }],
      }),
    });

    expect(issues).toEqual([]);
  });

  it('gives nothing for an empty result', () => {
    expect(toNormalizeValuesIssues({ dataset, result: result({}) })).toEqual(
      []
    );
  });
});
