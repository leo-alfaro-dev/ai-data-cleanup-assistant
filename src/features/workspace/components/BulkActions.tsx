import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import type { Confidence, IssueCategory } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { confidenceLabels } from '../confidenceLabels';
import { issueCategories } from '../issueCategories';
import { listBulkAcceptable } from '../state/listBulkAcceptable';
import { listBulkRejectable } from '../state/listBulkRejectable';
import { reviewActions, useDecisions } from '../state/reviewStore';
import { useIssues } from '../state/useIssues';

export type BulkActionsProps = React.ComponentProps<'div'> & {
  category: IssueCategory;
};

export function BulkActions({
  category,
  className = '',
  ...props
}: BulkActionsProps) {
  const [minimumConfidence, setMinimumConfidence] =
    useState<Confidence>('high');
  const issues = useIssues();
  const decisions = useDecisions();
  const { acceptableCount, rejectableCount } = useMemo(
    () => ({
      acceptableCount: listBulkAcceptable({
        issues,
        decisions,
        category,
        minimumConfidence,
      }).length,
      rejectableCount: listBulkRejectable({ issues, decisions, category })
        .length,
    }),
    [issues, decisions, category, minimumConfidence]
  );

  return (
    <div
      role="group"
      aria-label={`Decide every pending ${issueCategories[category].label} issue at once`}
      className={twMerge('flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      <Button
        disabled={acceptableCount === 0}
        onClick={() => reviewActions.acceptAll({ category, minimumConfidence })}
      >
        Accept all {WIDENED_COPY[minimumConfidence]} ·{' '}
        {formatCount(acceptableCount)}
      </Button>
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        Down to
        <select
          value={minimumConfidence}
          className="h-8 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onChange={(event) => {
            const chosen = WIDENING_CHOICES.find(
              (choice) => choice === event.target.value
            );
            if (chosen) setMinimumConfidence(chosen);
          }}
        >
          {WIDENING_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {confidenceLabels[choice]}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={rejectableCount === 0}
        onClick={() => reviewActions.rejectAll({ category })}
      >
        Reject all · {formatCount(rejectableCount)}
      </Button>
    </div>
  );
}

const WIDENING_CHOICES = ['high', 'medium', 'low'] as const;

const WIDENED_COPY: Record<Confidence, string> = {
  certain: 'certain',
  high: 'certain and high',
  medium: 'certain, high and medium',
  low: 'with a suggestion',
};
