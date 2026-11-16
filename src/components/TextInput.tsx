import { twMerge } from 'tailwind-variants';

export type TextInputProps = React.ComponentProps<'input'>;

export function TextInput({ className = '', ...props }: TextInputProps) {
  return (
    <input
      className={twMerge(
        'h-8 min-w-0 rounded-lg border border-border-strong bg-surface px-2.5 font-mono text-sm font-normal text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className
      )}
      {...props}
    />
  );
}
