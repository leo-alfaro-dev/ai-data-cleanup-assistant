import { RxExclamationTriangle } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { IconCircle } from '@/components/IconCircle';

export type FailurePanelProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  title: string;
};

/** A failure: a title, and as children its explanation and what to do next. */
export function FailurePanel({
  title,
  children,
  className = '',
  ...props
}: FailurePanelProps) {
  return (
    <div
      className={twMerge(
        'flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm',
        className
      )}
      {...props}
    >
      <IconCircle icon={RxExclamationTriangle} tone="danger" size="sm" />
      <div className="flex min-w-0 flex-col items-start gap-1 pt-1">
        <p className="font-semibold break-words">{title}</p>
        {children}
      </div>
    </div>
  );
}
