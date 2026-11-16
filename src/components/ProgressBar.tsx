import { useId } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type ProgressBarProps = React.ComponentProps<'div'> &
  VariantProps<typeof progressBar> & {
    value: number;
    label: string;
  };

export function ProgressBar({
  value,
  label,
  emphasis,
  className = '',
  ...props
}: ProgressBarProps) {
  const labelId = useId();
  const percentage = Math.round(Math.min(100, Math.max(0, value)));
  const slots = progressBar({ emphasis });

  return (
    <div className={slots.root({ className })} {...props}>
      <div className={slots.header()}>
        <span id={labelId} className={slots.label()}>
          {label}
        </span>
        <span aria-hidden className={slots.percentage()}>
          {percentage}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className={slots.track()}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const progressBar = tv({
  slots: {
    root: 'flex flex-col gap-2',
    header: 'flex items-baseline justify-between gap-4',
    label: 'text-sm text-text-secondary',
    percentage: 'text-xs font-medium text-text-secondary tabular-nums',
    track: 'h-1.5 overflow-hidden rounded-full bg-tint',
  },
  variants: {
    emphasis: {
      quiet: {},
      headline: {
        label:
          'text-xl font-semibold tracking-tight text-text-primary tabular-nums',
        track: 'h-2',
      },
    },
  },
  defaultVariants: { emphasis: 'quiet' },
});
