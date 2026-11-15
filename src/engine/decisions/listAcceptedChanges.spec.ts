import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import type { Decision } from './decision';
import { listAcceptedChanges } from './listAcceptedChanges';

const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(1) };

describe('listAcceptedChanges', () => {
  it('lists the suggestion of each accepted issue, in issue order', () => {
    const issues = [issue('b', trim), issue('a', trim), issue('c', trim)];

    const accepted = listAcceptedChanges({
      issues,
      decisions: decisions({
        a: { status: 'accepted' },
        c: { status: 'accepted' },
      }),
    });

    expect(accepted).toEqual([
      { issueId: 'a', change: trim },
      { issueId: 'c', change: trim },
    ]);
  });

  it('lists the edit instead of the suggestion for an edited issue', () => {
    const edit: Change = { kind: 'trimWhitespace', column: toColumnKey(2) };

    expect(
      listAcceptedChanges({
        issues: [issue('a', trim)],
        decisions: decisions({ a: { status: 'edited', change: edit } }),
      })
    ).toEqual([{ issueId: 'a', change: edit }]);
  });

  it('leaves out pending and rejected issues', () => {
    const issues = [issue('a', trim), issue('b', trim)];

    expect(
      listAcceptedChanges({
        issues,
        decisions: decisions({ b: { status: 'rejected' } }),
      })
    ).toEqual([]);
  });

  it('leaves out an accepted issue that has no suggestion', () => {
    const issues = [issue('a', null)];

    expect(
      listAcceptedChanges({
        issues,
        decisions: decisions({ a: { status: 'accepted' } }),
      })
    ).toEqual([]);
  });

  it('ignores a decision for an issue the file no longer has', () => {
    expect(
      listAcceptedChanges({
        issues: [],
        decisions: decisions({ gone: { status: 'accepted' } }),
      })
    ).toEqual([]);
  });
});

function issue(id: string, suggestion: Change | null): Issue {
  return {
    id: toIssueId(id),
    category: 'inconsistent',
    source: 'check',
    confidence: 'certain',
    rows: [],
    column: toColumnKey(1),
    suggestion,
    details: { kind: 'invalidEmails' },
  };
}

function decisions(
  entries: Record<string, Decision>
): ReadonlyMap<IssueId, Decision> {
  return new Map(
    Object.entries(entries).map(([id, decision]) => [toIssueId(id), decision])
  );
}
