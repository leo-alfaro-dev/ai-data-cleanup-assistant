import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { useAiRun } from '../state/aiStore';
import { summarizeAiTasks } from '../state/summarizeAiTasks';
import { AiTaskRow } from './AiTaskRow';

export type RunProgressProps = React.ComponentProps<'section'>;

export function RunProgress({ className = '', ...props }: RunProgressProps) {
  const run = useAiRun();
  const summaries = useMemo(() => summarizeAiTasks(run?.jobs ?? []), [run]);

  return (
    <section
      aria-label="AI tasks"
      className={twMerge('flex flex-col gap-2', className)}
      {...props}
    >
      <ul className="flex flex-col gap-2">
        {summaries.map((summary) => (
          <AiTaskRow key={summary.task} summary={summary} />
        ))}
      </ul>
    </section>
  );
}
