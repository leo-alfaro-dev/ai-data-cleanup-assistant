import { useId } from 'react';
import { RxDownload } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { Wordmark } from '@/components/Wordmark';
import { PRODUCT_NAME } from '../productName';
import { useHasAiCalls } from '../state/aiStore';
import { useAnalysisPhase } from '../state/analysisStore';
import { helpActions } from '../state/helpStore';
import { exportActions } from '../state/exportStore';
import { workspaceActions } from '../state/workspaceStore';
import { AiCallSummary } from './AiCallSummary';
import { DatasetFacts } from './DatasetFacts';
import { ShortcutTooltip } from './ShortcutTooltip';

export type WorkspaceHeaderProps = React.ComponentProps<'header'>;

export function WorkspaceHeader({
  className = '',
  ...props
}: WorkspaceHeaderProps) {
  const hintId = useId();
  const hasAiCalls = useHasAiCalls();
  const analysisStatus = useAnalysisPhase().status;
  const isChecking = analysisStatus === 'idle' || analysisStatus === 'running';

  return (
    <header
      className={twMerge(
        'dot-grid flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-wash px-3 py-2.5 sm:gap-x-5 sm:px-4',
        className
      )}
      {...props}
    >
      <h1 className="flex shrink-0 items-center">
        <button
          type="button"
          title="Back to start"
          className="flex cursor-pointer items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          onClick={() => workspaceActions.reset()}
        >
          <span className="sr-only">{PRODUCT_NAME}</span>
          <Wordmark className="h-6 text-primary" />
        </button>
      </h1>
      <DatasetFacts className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:border-l sm:border-border sm:pl-5" />
      <div className="flex flex-wrap items-center gap-2">
        {hasAiCalls && <AiCallSummary />}
        <ShortcutTooltip action="help">
          <Button variant="ghost" onClick={() => helpActions.open()}>
            Shortcuts
          </Button>
        </ShortcutTooltip>
        <Button onClick={() => workspaceActions.reset()}>
          Load another file
        </Button>
        <Button
          variant="primary"
          disabled={isChecking}
          title={isChecking ? EXPORT_WAITS_FOR_CHECKS : undefined}
          aria-describedby={isChecking ? hintId : undefined}
          onClick={() => void exportActions.open()}
        >
          <RxDownload aria-hidden className="size-3.5" />
          Export
        </Button>
        {isChecking && (
          <span id={hintId} className="sr-only">
            {EXPORT_WAITS_FOR_CHECKS}
          </span>
        )}
      </div>
    </header>
  );
}

const EXPORT_WAITS_FOR_CHECKS = 'Export is available when the checks finish.';
