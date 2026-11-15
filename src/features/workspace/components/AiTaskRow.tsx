import { RxCheck, RxExclamationTriangle } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
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
      className={twMerge(
        'flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{aiTaskLabels[summary.task]}</span>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary tabular-nums">
          {summary.status === 'done' && (
            <RxCheck aria-hidden className="size-3.5" />
          )}
          {summary.status === 'failed' && (
            <RxExclamationTriangle
              aria-hidden
              className="size-3.5 text-danger"
            />
          )}
          {statusCopy(summary)}
        </span>
      </div>
      {summary.status === 'failed' && (
        <div className="flex flex-col gap-2">
          <p className="text-text-secondary">
            {aiFailureCopy[summary.reason]}{' '}
            {!hasOwnKey && ownKeyOffer(summary.reason)}
          </p>
          <Button
            className="self-start"
            disabled={isRunning}
            onClick={() => void aiActions.retryTask(summary.task)}
          >
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
