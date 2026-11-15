import type { IssueId } from '@/engine/issues/issue';
import type { Change } from './change';

export type ChangeOrigin = {
  issueId: IssueId;
  kind: Change['kind'];
};
