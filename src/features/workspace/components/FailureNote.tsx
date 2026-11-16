import { RxExclamationTriangle } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';

export type FailureNoteProps = React.ComponentProps<'p'>;

/** A short alert that something failed. */
export function FailureNote({
  children,
  className = '',
  ...props
}: FailureNoteProps) {
  return (
    <p
      role="alert"
      className={twMerge(
        'flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger',
        className
      )}
      {...props}
    >
      <RxExclamationTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
