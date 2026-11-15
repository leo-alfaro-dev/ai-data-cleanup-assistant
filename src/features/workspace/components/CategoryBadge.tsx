import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import type { IssueCategory } from '@/engine/issues/issue';
import { categoryTone } from '../categoryTone';
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
  const { text, tint } = categoryTone({ category });

  return (
    <Badge className={twMerge(tint(), text(), className)} {...props}>
      <Icon aria-hidden className="size-3" />
      {label}
    </Badge>
  );
}
