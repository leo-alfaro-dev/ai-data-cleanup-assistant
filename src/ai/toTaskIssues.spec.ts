import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import { toTaskIssues } from './toTaskIssues';

const dataset = toDataset('id,state', '1,CA', '2,Calif.', '3,TX');

describe('toTaskIssues', () => {
  it('turns a normalizeValues result into inconsistent-values issues and no notes', () => {
    const { issues, notes } = toTaskIssues({
      dataset,
      taskResult: {
        task: 'normalizeValues',
        result: {
          column: { key: 1, header: 'state', dominantType: 'text' },
          groups: [
            {
              canonical: 'CA',
              isCanonicalInFile: true,
              variants: ['Calif.'],
              reason: 'Both name California.',
              confidence: 'high',
            },
          ],
          placeholders: [],
          claimCount: 2,
          droppedClaims: 0,
        },
      },
    });

    expect(issues.map(({ category, source }) => [category, source])).toEqual([
      ['inconsistent', 'ai'],
    ]);
    expect(notes).toEqual([]);
  });

  it('turns an assessSuspiciousRows result into issues for a sampled row', () => {
    const { issues } = toTaskIssues({
      dataset,
      taskResult: {
        task: 'assessSuspiciousRows',
        result: {
          rows: [
            {
              rowId: 2,
              flaggedBy: [],
              isSuspicious: true,
              column: 1,
              reason: 'An unusual state.',
              confidence: 'medium',
              suggestedValue: null,
            },
          ],
          claimCount: 1,
          droppedClaims: 0,
        },
      },
    });

    expect(issues.map(({ category }) => category)).toEqual(['suspicious']);
  });

  it('turns a confirmDuplicates result with no pairs into no issues', () => {
    const { issues, notes } = toTaskIssues({
      dataset,
      taskResult: {
        task: 'confirmDuplicates',
        result: { duplicates: [], claimCount: 0, droppedClaims: 0 },
      },
    });

    expect([issues, notes]).toEqual([[], []]);
  });
});
