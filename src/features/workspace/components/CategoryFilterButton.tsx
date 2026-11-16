import { tv } from 'tailwind-variants';
import type { IssueCategory } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { issueCategories } from '../issueCategories';

export type CategoryFilterButtonProps = React.ComponentProps<'button'> & {
  category: IssueCategory;
  count: number;
  isActive: boolean;
};

// The label comes first in the DOM, so the button is named "Duplicates 80"; the count shows first.
export function CategoryFilterButton({
  category,
  count,
  isActive,
  className = '',
  ...props
}: CategoryFilterButtonProps) {
  const { label, icon: Icon } = issueCategories[category];
  const isEmpty = count === 0;
  const slots = categoryFilterButton({ isActive, isEmpty });

  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={isEmpty}
      className={slots.root({ className })}
      {...props}
    >
      <Icon aria-hidden className={slots.icon()} />
      <span className={slots.label()}>{label}</span>{' '}
      <span className={slots.count()}>{formatCount(count)}</span>
    </button>
  );
}

const categoryFilterButton = tv({
  slots: {
    root: 'relative flex min-w-0 cursor-pointer flex-col-reverse items-start justify-end gap-1 rounded-xl border px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed',
    icon: 'absolute top-2 right-2 size-3.5',
    label: 'text-xs leading-tight font-medium hyphens-auto',
    count: 'text-xl leading-none font-semibold tracking-tight tabular-nums',
  },
  variants: {
    isActive: {
      true: {
        root: 'border-primary-strong bg-primary text-on-primary shadow-sm shadow-primary/20',
        icon: 'text-on-primary/85',
        label: 'text-on-primary/85',
      },
      false: {
        root: 'border-border bg-surface text-text-primary shadow-xs hover:border-primary/40 hover:bg-wash disabled:border-dashed disabled:bg-transparent disabled:text-text-secondary disabled:shadow-none',
        icon: 'text-primary',
        label: 'text-primary',
      },
    },
    isEmpty: { true: {}, false: {} },
  },
  compoundVariants: [
    {
      isActive: false,
      isEmpty: true,
      class: { icon: 'text-text-secondary', label: 'text-text-secondary' },
    },
  ],
});
