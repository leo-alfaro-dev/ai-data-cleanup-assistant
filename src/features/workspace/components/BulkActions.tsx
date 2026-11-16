import { useMemo, useState } from 'react';
import { RxCheck, RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
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
        variant="tint"
        disabled={acceptableCount === 0}
        onClick={() => reviewActions.acceptAll({ category, minimumConfidence })}
      >
        <RxCheck aria-hidden className="size-3.5" />
        Apply all {WIDENED_COPY[minimumConfidence]} ·{' '}
        {formatCount(acceptableCount)}
      </Button>
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        Down to
        <Select
          value={minimumConfidence}
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
        </Select>
      </label>
      <Button
        variant="ghost"
        disabled={rejectableCount === 0}
        onClick={() => reviewActions.rejectAll({ category })}
      >
        <RxCross2 aria-hidden className="size-3.5" />
        Keep all as is · {formatCount(rejectableCount)}
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
