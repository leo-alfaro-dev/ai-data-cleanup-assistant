import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { AiNote } from '@/engine/issues/aiNote';
import { toIssueId } from '@/engine/issues/toIssueId';
import { describeAiNotes } from './aiNoteCopy';

function note(isSuspicious: boolean): AiNote {
  return {
    issueId: toIssueId('numeric-outliers:2'),
    rowId: toRowId(1),
    isSuspicious,
    column: toColumnKey(2),
    reason: 'Because.',
    confidence: 'high',
    suggestedValue: null,
  };
}

describe('describeAiNotes', () => {
  it('says nothing when the AI reviewed no row of the issue', () => {
    expect(describeAiNotes({ notes: [], rowCount: 3 })).toBeNull();
  });

  it('says the issue is plausible when every reviewed row was', () => {
    expect(
      describeAiNotes({ notes: [note(false), note(false)], rowCount: 2 })
    ).toBe('AI found it plausible');
  });

  it('counts the suspicious rows among those reviewed', () => {
    expect(
      describeAiNotes({
        notes: [note(true), note(false), note(true)],
        rowCount: 3,
      })
    ).toBe('AI: 2 of 3 rows suspicious');
  });

  it('says how many of the rows were reviewed when the AI saw only some', () => {
    expect(
      describeAiNotes({ notes: [note(false), note(false)], rowCount: 10 })
    ).toBe('AI reviewed 2 of 10 rows, all plausible');
    expect(
      describeAiNotes({ notes: [note(true), note(false)], rowCount: 10 })
    ).toBe('AI reviewed 2 of 10 rows, 1 suspicious');
  });
});
