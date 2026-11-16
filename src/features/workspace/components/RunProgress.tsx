import { useId, useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
import { useAiRun } from '../state/aiStore';
import { summarizeAiTasks } from '../state/summarizeAiTasks';
import { AiTaskRow } from './AiTaskRow';

export type RunProgressProps = React.ComponentProps<'section'>;

export function RunProgress({ className = '', ...props }: RunProgressProps) {
  const run = useAiRun();
  const summaries = useMemo(() => summarizeAiTasks(run?.jobs ?? []), [run]);
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={twMerge('flex flex-col gap-2', className)}
      {...props}
    >
      <h2 id={titleId} className={eyebrow()}>
        AI tasks
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        {summaries.map((summary) => (
          <AiTaskRow key={summary.task} summary={summary} />
        ))}
      </ul>
    </section>
  );
}
