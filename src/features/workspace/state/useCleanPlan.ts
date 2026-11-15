import type { CleanPlan } from '@/engine/changes/cleanPlan';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { Column, Row } from '@/engine/dataset/dataset';
import type { Decision } from '@/engine/decisions/decision';
import { listAcceptedChanges } from '@/engine/decisions/listAcceptedChanges';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { useIssues } from './analysisStore';
import { flattenChunks } from './flattenChunks';
import { useDecisions } from './reviewStore';
import { useRowChunks } from './useRowChunks';
import { useFacts } from './workspaceStore';

type PlanInputs = {
  issues: readonly Issue[];
  decisions: ReadonlyMap<IssueId, Decision>;
  rowChunks: readonly (readonly Row[])[];
  columns: readonly Column[];
};

export function useCleanPlan(): CleanPlan {
  const issues = useIssues();
  const decisions = useDecisions();
  const rowChunks = useRowChunks();
  const { columns } = useFacts();

  return compilePlan({ issues, decisions, rowChunks, columns });
}

// Shared by every cell on screen: the plan is compiled once per change of its inputs.
const compilePlan = memoizeLast(
  ({ issues, decisions, rowChunks, columns }: PlanInputs): CleanPlan =>
    compileCleanPlan({
      accepted: listAcceptedChanges({ issues, decisions }),
      dataset: { columns, rows: flattenChunks(rowChunks) },
    })
);
