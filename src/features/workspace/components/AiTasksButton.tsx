import { useMemo, useState } from 'react';
import { Popover } from 'radix-ui';
import { RxCheck, RxExclamationTriangle } from 'react-icons/rx';
import { tv } from 'tailwind-variants';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import { aiTasksProgressCopy } from '../aiTasksProgressCopy';
import type { AiRun } from '../state/aiRun';
import type { AiTaskSummary } from '../state/aiTaskSummary';
import { useAiRun } from '../state/aiStore';
import { summarizeAiTasks } from '../state/summarizeAiTasks';
import { RunProgress } from './RunProgress';

export type AiTasksButtonProps = Omit<ButtonProps, 'children'>;

// Named by its status, which it shows only as an icon: "AI tasks: 2 of 3 done".
// A failure blinks until the task list has been seen; a later failure blinks again.
export function AiTasksButton({
  className = '',
  ...props
}: AiTasksButtonProps) {
  const run = useAiRun();
  const summaries = useMemo(() => summarizeAiTasks(run?.jobs ?? []), [run]);
  const { tone, label, progress } = toStatus(summaries);
  const [isOpen, setIsOpen] = useState(false);
  const [seenRun, setSeenRun] = useState<AiRun | null>(null);
  const isBlinking = tone === 'failed' && !isOpen && seenRun !== run;

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setSeenRun(run);
      }}
    >
      <Popover.Trigger asChild>
        <Button
          aria-label={label}
          title={label}
          variant={VARIANTS[tone]}
          className={trigger({ isBlinking, className })}
          {...props}
        >
          {tone === 'running' && (
            <span
              aria-hidden
              className="size-4 rounded-full progress-ring"
              style={{
                background: `conic-gradient(var(--color-primary) ${progress}%, var(--color-tint) 0)`,
              }}
            />
          )}
          {tone === 'done' && (
            <RxCheck
              aria-hidden
              className="size-4 motion-safe:animate-settle"
            />
          )}
          {tone === 'failed' && (
            <RxExclamationTriangle
              aria-hidden
              className="size-3.5 motion-safe:animate-settle"
            />
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="AI tasks"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-30 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-4 text-sm shadow-xl shadow-text-primary/10 focus:outline-none"
        >
          <RunProgress />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type Tone = 'running' | 'done' | 'failed';

function toStatus(summaries: readonly AiTaskSummary[]): {
  tone: Tone;
  label: string;
  progress: number;
} {
  const label = `AI tasks: ${aiTasksProgressCopy(summaries)}`;
  const isSettled = summaries.every(
    ({ status }) => status === 'done' || status === 'failed'
  );
  if (!isSettled) {
    const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
    const settled = summaries.reduce(
      (sum, summary) => sum + summary.settled,
      0
    );
    const progress = total === 0 ? 0 : Math.round((settled / total) * 100);

    return { tone: 'running', label, progress };
  }

  const hasFailed = summaries.some(({ status }) => status === 'failed');

  return { tone: hasFailed ? 'failed' : 'done', label, progress: 100 };
}

const VARIANTS: Record<Tone, ButtonProps['variant']> = {
  running: 'secondary',
  done: 'tint',
  failed: 'danger',
};

const trigger = tv({
  base: 'w-8 px-0',
  variants: {
    isBlinking: { true: 'motion-safe:animate-blink', false: '' },
  },
});
