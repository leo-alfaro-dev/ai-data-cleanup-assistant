import { RxCheckCircled } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { BackdropIcon } from '@/components/BackdropIcon';
import { eyebrow } from '@/components/eyebrow';
import { toPanelId, toTabId } from '../panelIds';
import { useAnalysisPhase } from '../state/analysisStore';
import { useHasReplayFailed, useRecipeResult } from '../state/recipeStore';
import { useCategoryFilter } from '../state/reviewStore';
import { useIssues } from '../state/useIssues';
import { AiToolbar } from './AiToolbar';
import { AnalysisFailure } from './AnalysisFailure';
import { AnalysisProgress } from './AnalysisProgress';
import { BulkActions } from './BulkActions';
import { CategorySummary } from './CategorySummary';
import { FailureNote } from './FailureNote';
import { HistoryButtons } from './HistoryButtons';
import { IssueList } from './IssueList';
import { IssueListSkeleton } from './IssueListSkeleton';
import { ReviewProgress } from './ReviewProgress';
import { RecipeReport } from './RecipeReport';

export type IssuesPanelProps = React.ComponentProps<'section'>;

export function IssuesPanel({ className = '', ...props }: IssuesPanelProps) {
  const phase = useAnalysisPhase();
  const issueCount = useIssues().length;
  const category = useCategoryFilter();
  const recipeResult = useRecipeResult();
  const hasReplayFailed = useHasReplayFailed();
  return (
    <section
      id={toPanelId('issues')}
      role="tabpanel"
      aria-labelledby={toTabId('issues')}
      className={twMerge(
        'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-canvas p-3 lg:w-100 lg:flex-none lg:border-r lg:border-border',
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
          {recipeResult && <RecipeReport result={recipeResult} />}
          {hasReplayFailed && (
            <FailureNote>
              The recipe could not be applied. The checks still work.
            </FailureNote>
          )}
          <CategorySummary />
          {category !== null && <BulkActions category={category} />}
          {issueCount === 0 && (
            <p className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
              <BackdropIcon
                icon={RxCheckCircled}
                className="-right-3 -bottom-5 size-20"
              />
              The checks found no issues in this file.
            </p>
          )}
          {issueCount > 0 && (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className={eyebrow()}>Review</h2>
                  <HistoryButtons />
                </div>
                <ReviewProgress />
              </div>
              <IssueList className="min-h-40 max-lg:min-h-112" />
            </>
          )}
        </>
      )}
    </section>
  );
}
