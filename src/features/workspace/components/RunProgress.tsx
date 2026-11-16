import { useId, useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
import { useAiRun, useHostedQuota } from '../state/aiStore';
import { useHasOwnKey } from '../state/settingsStore';
import { summarizeAiTasks } from '../state/summarizeAiTasks';
import { AiTaskRow } from './AiTaskRow';

export type RunProgressProps = React.ComponentProps<'section'>;

export function RunProgress({ className = '', ...props }: RunProgressProps) {
  const run = useAiRun();
  const summaries = useMemo(() => summarizeAiTasks(run?.jobs ?? []), [run]);
  const quota = useHostedQuota();
  const hasOwnKey = useHasOwnKey();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={twMerge('flex flex-col gap-2', className)}
      {...props}
    >
      <div className="flex items-baseline gap-2">
        <h2 id={titleId} className={eyebrow()}>
          AI tasks
        </h2>
        {quota && !hasOwnKey && (
          <span className="text-xs text-text-secondary tabular-nums">
            · {quota.used} of {quota.limit} requests, resets at{' '}
            {new Date(quota.resetsAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        {summaries.map((summary) => (
          <AiTaskRow key={summary.task} summary={summary} />
        ))}
      </ul>
    </section>
  );
}
