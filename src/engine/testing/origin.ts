import type { Change } from '@/engine/changes/change';
import type { ChangeOrigin } from '@/engine/changes/changeOrigin';
import { toIssueId } from '@/engine/issues/toIssueId';

export function origin({
  issue,
  kind,
}: {
  issue: string;
  kind: Change['kind'];
}): ChangeOrigin {
  return { issueId: toIssueId(issue), kind };
}
