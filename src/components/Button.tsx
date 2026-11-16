import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof button>;

export function Button({
  variant,
  size,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={button({ variant, size, className })}
      {...props}
    />
  );
}

const button = tv({
  base: 'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    variant: {
      primary:
        'border border-primary-strong bg-primary text-on-primary shadow-xs inset-shadow-2xs inset-shadow-on-primary/15 hover:bg-primary-strong',
      secondary:
        'border border-border bg-surface text-text-primary shadow-xs hover:border-border-strong hover:bg-wash',
      tint: 'bg-tint text-primary hover:bg-highlight hover:text-primary-strong',
      ghost: 'text-text-secondary hover:bg-muted hover:text-text-primary',
      inverse:
        'bg-surface text-primary shadow-sm hover:bg-wash focus-visible:outline-on-primary',
      danger:
        'border border-danger bg-danger text-on-primary hover:bg-danger/90',
    },
    size: {
      md: 'h-8 px-3.5 text-sm',
      lg: 'h-10 px-5 text-sm',
    },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
});
