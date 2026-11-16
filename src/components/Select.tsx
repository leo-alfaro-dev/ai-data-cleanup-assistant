import { twMerge } from 'tailwind-variants';

export type SelectProps = React.ComponentProps<'select'>;

export function Select({ className = '', ...props }: SelectProps) {
  return (
    <select
      className={twMerge(
        'h-8 min-w-0 cursor-pointer rounded-full border border-border bg-surface pr-8 pl-3 text-sm text-text-primary shadow-xs transition-colors select-chevron hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
