import { useMemo } from 'react';
import type { AiNote } from '@/engine/issues/aiNote';
import type { IssueId } from '@/engine/issues/issue';
import { useAiNotes } from './aiStore';

export function useIssueNotes(issueId: IssueId): readonly AiNote[] {
  const notes = useAiNotes();

  return useMemo(
    () => notes.filter((note) => note.issueId === issueId),
    [notes, issueId]
  );
}
