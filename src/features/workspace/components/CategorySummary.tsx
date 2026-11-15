import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { countIssuesByCategory } from '@/engine/issues/countIssuesByCategory';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
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

  return (
    <div
      role="group"
      aria-label="Filter issues by category"
      className={twMerge('grid grid-cols-2 gap-2', className)}
      {...props}
    >
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
  );
}
