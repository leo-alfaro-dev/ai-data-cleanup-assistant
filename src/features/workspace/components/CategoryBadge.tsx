import { eyebrow } from '@/components/eyebrow';
import type { IssueCategory } from '@/engine/issues/issue';
import { issueCategories } from '../issueCategories';

export type CategoryBadgeProps = React.ComponentProps<'span'> & {
  category: IssueCategory;
};

export function CategoryBadge({
  category,
  className = '',
  ...props
}: CategoryBadgeProps) {
  const { label, icon: Icon } = issueCategories[category];

  return (
    <span
      className={eyebrow({
        className: `inline-flex min-w-0 items-center gap-1.5 tracking-wider ${className}`,
      })}
      {...props}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}
