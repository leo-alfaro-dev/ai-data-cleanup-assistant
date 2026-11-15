import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import type { IssueDetails } from '@/engine/issues/issueDetails';
import { toIssueId } from '@/engine/issues/toIssueId';
import { listIssueGroups } from './listIssueGroups';

describe('listIssueGroups', () => {
  it('gives the groups of exact and normalized duplicates', () => {
    const groups = [
      [toRowId(1), toRowId(4)],
      [toRowId(2), toRowId(3)],
    ];

    expect(listIssueGroups(issue({ kind: 'exactDuplicates', groups }))).toEqual(
      groups
    );
    expect(
      listIssueGroups(issue({ kind: 'normalizedDuplicates', groups }))
    ).toEqual(groups);
  });

  it('takes the rows of a shared-identifier issue as one group', () => {
    const rows = [toRowId(5), toRowId(9)];

    expect(
      listIssueGroups(
        issue(
          { kind: 'sharedIdentifiers', links: [], hasConflictingNames: false },
          rows
        )
      )
    ).toEqual([rows]);
  });

  it('gives no groups for any other issue', () => {
    expect(listIssueGroups(issue({ kind: 'invalidEmails' }))).toEqual([]);
  });
});

function issue(details: IssueDetails, rows: Issue['rows'] = []): Issue {
  return {
    id: toIssueId('issue'),
    category: 'duplicate',
    source: 'check',
    confidence: 'high',
    rows,
    column: null,
    suggestion: null,
    details,
  };
}
