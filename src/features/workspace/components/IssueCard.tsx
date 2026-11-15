import { useId } from 'react';
import { tv } from 'tailwind-variants';
import type { Issue } from '@/engine/issues/issue';
import { countOf } from '@/lib/countOf';
import { confidenceLabels } from '../confidenceLabels';
import { describeAiNotes } from '../aiNoteCopy';
import { describeIssue } from '../issueCopy';
import { reviewActions, useSelectedIssueId } from '../state/reviewStore';
import { useIssueNotes } from '../state/useIssueNotes';
import { useFacts } from '../state/workspaceStore';
import { sourceLabels } from '../sourceLabels';
import { CategoryBadge } from './CategoryBadge';
import { DecisionActions } from './DecisionActions';

export type IssueCardProps = React.ComponentProps<'article'> & {
  issue: Issue;
};

export function IssueCard({ issue, className = '', ...props }: IssueCardProps) {
  const titleId = useId();
  const { columns } = useFacts();
  const isSelected = useSelectedIssueId() === issue.id;
  const { title, summary } = describeIssue({ issue, columns });
  const aiNote = describeAiNotes({
    notes: useIssueNotes(issue.id),
    rowCount: issue.rows.length,
  });

  return (
    <article
      aria-labelledby={titleId}
      aria-current={isSelected ? 'true' : undefined}
      className={issueCard({ isSelected, className })}
      {...props}
    >
      <button
        type="button"
        className="flex min-w-0 cursor-pointer flex-col gap-1 rounded-md p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => reviewActions.select(issue.id)}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CategoryBadge category={issue.category} />
          <span className="text-xs text-text-secondary">
            {sourceLabels[issue.source]} · {confidenceLabels[issue.confidence]}
          </span>
        </span>
        <span id={titleId} className="text-sm font-medium break-words">
          {title}
        </span>
        <span className="line-clamp-2 text-xs text-text-secondary">
          {summary}
        </span>
        {aiNote && (
          <span className="text-xs text-text-secondary italic">{aiNote}</span>
        )}
        {issue.rows.length > 0 && (
          <span className="text-xs text-text-secondary tabular-nums">
            {countOf({ count: issue.rows.length, noun: 'row' })}
          </span>
        )}
      </button>
      <DecisionActions issue={issue} />
    </article>
  );
}

const issueCard = tv({
  base: 'flex flex-col gap-1 rounded-lg border bg-surface p-2',
  variants: {
    isSelected: {
      true: 'border-primary',
      false: 'border-border',
    },
  },
});
