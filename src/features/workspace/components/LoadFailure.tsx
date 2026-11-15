import { RxExclamationTriangle } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { loadFailureCopy } from '../loadFailureCopy';

export type LoadFailureProps = React.ComponentProps<'div'> & {
  fileName: string;
  reason: LoadFailureReason;
};

export function LoadFailure({
  fileName,
  reason,
  className = '',
  ...props
}: LoadFailureProps) {
  return (
    <div
      role="alert"
      className={twMerge(
        'flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm',
        className
      )}
      {...props}
    >
      <RxExclamationTriangle
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-danger"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium break-words">Could not load {fileName}</p>
        <p className="text-text-secondary">{loadFailureCopy[reason]}</p>
      </div>
    </div>
  );
}
