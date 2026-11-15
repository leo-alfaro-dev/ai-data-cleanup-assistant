import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof button>;

export function Button({
  variant,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={button({ variant, className })} {...props} />
  );
}

const button = tv({
  base: 'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    variant: {
      primary: 'bg-primary text-on-primary hover:bg-primary/85',
      secondary:
        'border border-border bg-surface text-text-primary hover:bg-muted',
      ghost: 'text-text-secondary hover:bg-muted hover:text-text-primary',
      danger: 'bg-danger text-on-primary hover:bg-danger/85',
    },
  },
  defaultVariants: { variant: 'secondary' },
});
