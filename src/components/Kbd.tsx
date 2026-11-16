import { twMerge } from 'tailwind-variants';

export type KbdProps = React.ComponentProps<'kbd'>;

export function Kbd({ className = '', ...props }: KbdProps) {
  return (
    <kbd
      className={twMerge(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-b-2 border-border bg-surface px-1 font-sans text-xs font-medium text-text-secondary',
        className
      )}
      {...props}
    />
  );
}
