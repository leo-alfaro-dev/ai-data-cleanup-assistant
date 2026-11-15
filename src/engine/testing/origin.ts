import type { Change } from '@/engine/changes/change';
import type { ChangeOrigin } from '@/engine/changes/changeOrigin';
import type { IssueId } from '@/engine/issues/issue';

export function origin({
  issue,
  kind,
}: {
  issue: string;
  kind: Change['kind'];
}): ChangeOrigin {
  return { issueId: issue as IssueId, kind };
}
