import { describe, expect, it } from 'vitest';
import type { Issue, IssueCategory } from './issue';
import { countIssuesByCategory } from './countIssuesByCategory';
import { toIssueId } from './toIssueId';

describe('countIssuesByCategory', () => {
  it('counts issues, not rows, in each of the four categories', () => {
    const issues = [
      issue('a', 'duplicate'),
      issue('b', 'duplicate'),
      issue('c', 'missing'),
    ];

    expect(countIssuesByCategory(issues)).toEqual({
      duplicate: 2,
      inconsistent: 0,
      missing: 1,
      suspicious: 0,
    });
  });

  it('gives zero for every category when there are no issues', () => {
    expect(countIssuesByCategory([])).toEqual({
      duplicate: 0,
      inconsistent: 0,
      missing: 0,
      suspicious: 0,
    });
  });
});

function issue(id: string, category: IssueCategory): Issue {
  return {
    id: toIssueId(id),
    category,
    source: 'check',
    confidence: 'certain',
    rows: [],
    column: null,
    suggestion: null,
    details: { kind: 'blankRows' },
  };
}
