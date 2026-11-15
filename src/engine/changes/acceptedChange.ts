import type { IssueId } from '@/engine/issues/issue';
import type { Change } from './change';

export type AcceptedChange = {
  issueId: IssueId;
  change: Change;
};
