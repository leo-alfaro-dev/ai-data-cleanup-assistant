import { describe, expect, it } from 'vitest';
import type { Issue, IssueCategory, IssueId } from '@/engine/issues/issue';
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

    expect(
      sortIssues({ issues, plausibleIssueIds: new Set() }).map(({ id }) => id)
    ).toEqual([
      'duplicate-big',
      'duplicate-a',
      'duplicate-b',
      'inconsistent',
      'missing-big',
      'missing-small',
      'suspicious',
    ]);
  });

  it('puts an issue the AI found plausible after the others of its category, never into another one', () => {
    const issues = [
      issue({ id: 'big-plausible', category: 'suspicious', rowCount: 9 }),
      issue({ id: 'small', category: 'suspicious', rowCount: 1 }),
      issue({ id: 'duplicate', category: 'duplicate', rowCount: 1 }),
    ];

    const sorted = sortIssues({
      issues,
      plausibleIssueIds: new Set([toIssueId('big-plausible')]),
    });

    expect(sorted.map(({ id }) => id)).toEqual([
      'duplicate',
      'small',
      'big-plausible',
    ]);
  });

  it('puts the more certain issue first within a category, whatever the rows it touches', () => {
    const issues = [
      issue({
        id: 'low-big',
        category: 'inconsistent',
        rowCount: 9,
        confidence: 'low',
      }),
      issue({ id: 'certain-small', category: 'inconsistent', rowCount: 1 }),
      issue({
        id: 'medium',
        category: 'inconsistent',
        rowCount: 5,
        confidence: 'medium',
      }),
      issue({
        id: 'high',
        category: 'inconsistent',
        rowCount: 2,
        confidence: 'high',
      }),
    ];

    expect(
      sortIssues({ issues, plausibleIssueIds: new Set() }).map(({ id }) => id)
    ).toEqual(['certain-small', 'high', 'medium', 'low-big']);
  });

  it('leaves the input alone and gives the same list for the same input', () => {
    const issues = [
      issue({ id: 'b', category: 'missing', rowCount: 1 }),
      issue({ id: 'a', category: 'duplicate', rowCount: 1 }),
    ];

    const plausibleIssueIds = new Set<IssueId>();
    const sorted = sortIssues({ issues, plausibleIssueIds });

    expect(issues.map(({ id }) => id)).toEqual(['b', 'a']);
    expect(sortIssues({ issues, plausibleIssueIds })).toBe(sorted);
  });
});

function issue({
  id,
  category,
  rowCount,
  confidence = 'certain',
}: {
  id: string;
  category: IssueCategory;
  rowCount: number;
  confidence?: Issue['confidence'];
}): Issue {
  return {
    id: toIssueId(id),
    category,
    source: 'check',
    confidence,
    rows: Array.from({ length: rowCount }, (_, index) => toRowId(index)),
    column: null,
    suggestion: null,
    details: { kind: 'blankRows' },
  };
}
