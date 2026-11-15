import { twMerge } from 'tailwind-variants';
import { toPanelId, toTabId } from '../panelIds';
import { useAiRun } from '../state/aiStore';
import { useAnalysisPhase } from '../state/analysisStore';
import { useIssues } from '../state/useIssues';
import { AiToolbar } from './AiToolbar';
import { AnalysisFailure } from './AnalysisFailure';
import { AnalysisProgress } from './AnalysisProgress';
import { CategorySummary } from './CategorySummary';
import { IssueList } from './IssueList';
import { IssueListSkeleton } from './IssueListSkeleton';
import { ReviewProgress } from './ReviewProgress';
import { RunProgress } from './RunProgress';

export type IssuesPanelProps = React.ComponentProps<'section'>;

export function IssuesPanel({ className = '', ...props }: IssuesPanelProps) {
  const phase = useAnalysisPhase();
  const hasAiTasks = (useAiRun()?.jobs.length ?? 0) > 0;
  const issueCount = useIssues().length;
  return (
    <section
      id={toPanelId('issues')}
      role="tabpanel"
      aria-labelledby={toTabId('issues')}
      className={twMerge(
        'flex min-h-0 flex-1 flex-col gap-3 bg-canvas p-3 lg:w-96 lg:flex-none lg:border-r lg:border-border',
        className
      )}
      {...props}
    >
      {phase.status === 'running' && (
        <>
          <AnalysisProgress stage={phase.stage} percentage={phase.percentage} />
          <IssueListSkeleton />
        </>
      )}
      {phase.status === 'failed' && <AnalysisFailure />}
      {phase.status === 'done' && (
        <>
          <AiToolbar />
          <CategorySummary />
          {hasAiTasks && <RunProgress />}
          {issueCount === 0 && (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
              The checks found no issues in this file.
            </p>
          )}
          {issueCount > 0 && (
            <>
              <ReviewProgress />
              <IssueList />
            </>
          )}
        </>
      )}
    </section>
  );
}
