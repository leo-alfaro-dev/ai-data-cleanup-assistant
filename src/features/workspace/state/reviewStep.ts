import type { IssueId } from '@/engine/issues/issue';

// What the last change to the decisions was, as data: the page words it for an announcement.
export type ReviewStep =
  | {
      kind: 'decided';
      status: 'accepted' | 'edited' | 'rejected' | 'removed';
      count: number;
      issueId: IssueId;
    }
  | { kind: 'undone' | 'redone'; count: number; undoDepth: number };
