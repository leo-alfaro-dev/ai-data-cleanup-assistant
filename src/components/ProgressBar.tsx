import { useId } from 'react';
import { twMerge } from 'tailwind-variants';

export type ProgressBarProps = React.ComponentProps<'div'> & {
  value: number;
  label: string;
};

export function ProgressBar({
  value,
  label,
  className = '',
  ...props
}: ProgressBarProps) {
  const labelId = useId();
  const percentage = Math.round(Math.min(100, Math.max(0, value)));

  return (
    <div className={twMerge('flex flex-col gap-2', className)} {...props}>
      <div className="flex items-baseline justify-between gap-4 text-sm text-text-secondary">
        <span id={labelId}>{label}</span>
        <span aria-hidden className="tabular-nums">
          {percentage}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
