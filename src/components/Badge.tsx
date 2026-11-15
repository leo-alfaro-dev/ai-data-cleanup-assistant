import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badge>;

export function Badge({ variant, className = '', ...props }: BadgeProps) {
  return <span className={badge({ variant, className })} {...props} />;
}

const badge = tv({
  base: 'inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap',
  variants: {
    variant: {
      neutral: 'bg-muted text-text-secondary',
      outline: 'border border-border text-text-secondary',
    },
  },
  defaultVariants: { variant: 'neutral' },
});
