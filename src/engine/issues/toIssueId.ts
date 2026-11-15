import type { IssueId } from './issue';

export function toIssueId(value: string): IssueId {
  return value as IssueId;
}
