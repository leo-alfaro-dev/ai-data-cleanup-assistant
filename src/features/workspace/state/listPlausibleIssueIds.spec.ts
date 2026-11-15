import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { AiNote } from '@/engine/issues/aiNote';
import { makeIssue } from '../testing/makeIssue';
import { listPlausibleIssueIds } from './listPlausibleIssueIds';

function note(issue: string, row: number, isSuspicious: boolean): AiNote {
  return {
    issueId: makeIssue({ id: issue }).id,
    rowId: toRowId(row),
    isSuspicious,
    column: toColumnKey(1),
    reason: 'Because.',
    confidence: 'high',
    suggestedValue: null,
  };
}

function issueOf(id: string, ...rows: number[]) {
  return { ...makeIssue({ id }), rows: rows.map(toRowId) };
}

describe('listPlausibleIssueIds', () => {
  it('lists an issue when every one of its rows was reviewed and found plausible', () => {
    const ids = listPlausibleIssueIds({
      issues: [issueOf('a', 1, 2)],
      notes: [note('a', 1, false), note('a', 2, false)],
    });

    expect([...ids]).toEqual(['a']);
  });

  it('leaves an issue out as soon as one reviewed row was found suspicious', () => {
    const ids = listPlausibleIssueIds({
      issues: [issueOf('a', 1, 2), issueOf('b', 3)],
      notes: [note('a', 1, false), note('a', 2, true), note('b', 3, false)],
    });

    expect([...ids]).toEqual(['b']);
  });

  it('leaves an issue out when some of its rows were not reviewed', () => {
    const ids = listPlausibleIssueIds({
      issues: [issueOf('a', 1, 2, 3)],
      notes: [note('a', 1, false), note('a', 2, false)],
    });

    expect(ids.size).toBe(0);
  });

  it('lists nothing without notes, since an issue the AI did not review is not plausible', () => {
    expect(
      listPlausibleIssueIds({ issues: [issueOf('a', 1)], notes: [] }).size
    ).toBe(0);
  });

  it('ignores a note about an issue that is no longer listed', () => {
    expect(
      listPlausibleIssueIds({ issues: [], notes: [note('a', 1, false)] }).size
    ).toBe(0);
  });
});
