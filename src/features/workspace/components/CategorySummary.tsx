import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { eyebrow } from '@/components/eyebrow';
import { countIssuesByCategory } from '@/engine/issues/countIssuesByCategory';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { useIssues } from '../state/useIssues';
import { reviewActions, useCategoryFilter } from '../state/reviewStore';
import { CategoryFilterButton } from './CategoryFilterButton';

export type CategorySummaryProps = React.ComponentProps<'div'>;

export function CategorySummary({
  className = '',
  ...props
}: CategorySummaryProps) {
  const issues = useIssues();
  const filter = useCategoryFilter();
  const counts = useMemo(() => countIssuesByCategory(issues), [issues]);
  const isShowingAll = filter === null;

  return (
    <div
      role="group"
      aria-label="Filter issues by category"
      className={twMerge('flex flex-col gap-1', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={eyebrow()}>Categories</h2>
        <Button
          aria-pressed={isShowingAll}
          variant={isShowingAll ? 'primary' : 'secondary'}
          onClick={() => reviewActions.filterByCategory(null)}
        >
          All <span className="tabular-nums">{formatCount(issues.length)}</span>
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {ISSUE_CATEGORIES.map((category) => (
          <CategoryFilterButton
            key={category}
            category={category}
            count={counts[category]}
            isActive={filter === category}
            onClick={() => reviewActions.filterByCategory(category)}
          />
        ))}
      </div>
    </div>
  );
}
