import { useMemo } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import type { IssueCategory } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { issueCategories } from '../issueCategories';
import { listBulkRejectable } from '../state/listBulkRejectable';
import { reviewActions, useDecisions } from '../state/reviewStore';
import { useIssues } from '../state/useIssues';
import { BulkApplyMenu } from './BulkApplyMenu';

export type BulkActionsProps = React.ComponentProps<'div'> & {
  category: IssueCategory;
};

export function BulkActions({
  category,
  className = '',
  ...props
}: BulkActionsProps) {
  const issues = useIssues();
  const decisions = useDecisions();
  const keepableCount = useMemo(
    () => listBulkRejectable({ issues, decisions, category }).length,
    [issues, decisions, category]
  );

  return (
    <div
      role="group"
      aria-label={`Decide every pending ${issueCategories[category].label} issue at once`}
      className={twMerge(
        'flex flex-wrap items-center justify-between gap-2',
        className
      )}
      {...props}
    >
      <BulkApplyMenu category={category} />
      <Button
        variant="ghost"
        disabled={keepableCount === 0}
        onClick={() => reviewActions.rejectAll({ category })}
      >
        <RxCross2 aria-hidden className="size-3.5" />
        Keep all {formatCount(keepableCount)} as is
      </Button>
    </div>
  );
}
