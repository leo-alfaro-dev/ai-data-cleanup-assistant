import { tv } from 'tailwind-variants';
import type { IssueCategory } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { categoryTone } from '../categoryTone';
import { issueCategories } from '../issueCategories';

export type CategoryFilterButtonProps = React.ComponentProps<'button'> & {
  category: IssueCategory;
  count: number;
  isActive: boolean;
};

export function CategoryFilterButton({
  category,
  count,
  isActive,
  className = '',
  ...props
}: CategoryFilterButtonProps) {
  const { label, icon: Icon } = issueCategories[category];
  const { text } = categoryTone({ category });

  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={count === 0}
      className={categoryFilterButton({ isActive, className })}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon aria-hidden className={`size-3.5 shrink-0 ${text()}`} />
        <span className="truncate">{label}</span>
      </span>{' '}
      <span className="font-medium tabular-nums">{formatCount(count)}</span>
    </button>
  );
}

const categoryFilterButton = tv({
  base: 'flex h-8 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    isActive: {
      true: 'border-primary bg-muted text-text-primary',
      false: 'border-border bg-surface text-text-secondary hover:bg-muted',
    },
  },
});
