import { RxCheck, RxExclamationTriangle, RxReload } from 'react-icons/rx';
import { tv, twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { aiFailureCopy } from '../aiFailureCopy';
import { aiTaskLabels } from '../aiTaskLabels';
import { ownKeyOffer } from '../ownKeyOffer';
import { aiActions, useIsAiRunning } from '../state/aiStore';
import type { AiTaskSummary } from '../state/aiTaskSummary';
import { useHasOwnKey } from '../state/settingsStore';

export type AiTaskRowProps = React.ComponentProps<'li'> & {
  summary: AiTaskSummary;
};

export function AiTaskRow({
  summary,
  className = '',
  ...props
}: AiTaskRowProps) {
  const isRunning = useIsAiRunning();
  const hasOwnKey = useHasOwnKey();

  return (
    <li
      className={twMerge('flex flex-col gap-2 px-3 py-2 text-sm', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-medium">
          {aiTaskLabels[summary.task]}
        </span>
        <span
          key={summary.status}
          className={statusPill({ status: summary.status })}
        >
          {summary.status === 'queued' && (
            <span
              aria-hidden
              className="size-1.5 rounded-full border border-current"
            />
          )}
          {summary.status === 'running' && (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
            />
          )}
          {summary.status === 'done' && (
            <RxCheck aria-hidden className="size-3.5" />
          )}
          {summary.status === 'failed' && (
            <RxExclamationTriangle aria-hidden className="size-3.5" />
          )}
          {statusCopy(summary)}
        </span>
      </div>
      {summary.status === 'failed' && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-text-secondary">
            {aiFailureCopy[summary.reason]}{' '}
            {!hasOwnKey && ownKeyOffer(summary.reason)}
          </p>
          <Button
            disabled={isRunning}
            onClick={() => void aiActions.retryTask(summary.task)}
          >
            <RxReload aria-hidden className="size-3.5" />
            Retry
          </Button>
        </div>
      )}
    </li>
  );
}

function statusCopy(summary: AiTaskSummary): string {
  switch (summary.status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return `Running, ${summary.settled} of ${summary.total} done`;
    case 'done':
      return 'Done';
    case 'failed':
      return summary.failedCount === summary.total
        ? 'Failed'
        : `${summary.failedCount} of ${summary.total} failed`;
  }
}

const statusPill = tv({
  base: 'flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums motion-safe:animate-settle',
  variants: {
    status: {
      queued: 'bg-muted text-text-secondary',
      running: 'bg-surface text-primary ring-1 ring-primary/30 ring-inset',
      done: 'bg-tint text-primary',
      failed: 'bg-danger/10 text-danger',
    },
  },
});
