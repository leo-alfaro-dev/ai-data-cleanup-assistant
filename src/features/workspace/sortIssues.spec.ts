import { describe, expect, it } from 'vitest';
import type { Issue, IssueCategory } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { toRowId } from '@/engine/dataset/toRowId';
import { sortIssues } from './sortIssues';

describe('sortIssues', () => {
  it('orders by category, then by rows affected, most first, then by id', () => {
    const issues = [
      issue({ id: 'missing-small', category: 'missing', rowCount: 1 }),
      issue({ id: 'duplicate-b', category: 'duplicate', rowCount: 2 }),
      issue({ id: 'suspicious', category: 'suspicious', rowCount: 9 }),
      issue({ id: 'duplicate-big', category: 'duplicate', rowCount: 5 }),
      issue({ id: 'duplicate-a', category: 'duplicate', rowCount: 2 }),
      issue({ id: 'inconsistent', category: 'inconsistent', rowCount: 1 }),
      issue({ id: 'missing-big', category: 'missing', rowCount: 4 }),
    ];

    expect(sortIssues(issues).map(({ id }) => id)).toEqual([
      'duplicate-big',
      'duplicate-a',
      'duplicate-b',
      'inconsistent',
      'missing-big',
      'missing-small',
      'suspicious',
    ]);
  });

  it('leaves the input alone and gives the same list for the same input', () => {
    const issues = [
      issue({ id: 'b', category: 'missing', rowCount: 1 }),
      issue({ id: 'a', category: 'duplicate', rowCount: 1 }),
    ];

    const sorted = sortIssues(issues);

    expect(issues.map(({ id }) => id)).toEqual(['b', 'a']);
    expect(sortIssues(issues)).toBe(sorted);
  });
});

function issue({
  id,
  category,
  rowCount,
}: {
  id: string;
  category: IssueCategory;
  rowCount: number;
}): Issue {
  return {
    id: toIssueId(id),
    category,
    source: 'check',
    confidence: 'certain',
    rows: Array.from({ length: rowCount }, (_, index) => toRowId(index)),
    column: null,
    suggestion: null,
    details: { kind: 'blankRows' },
  };
}
