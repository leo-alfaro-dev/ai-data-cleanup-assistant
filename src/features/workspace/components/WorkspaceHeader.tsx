import { useId } from 'react';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { useAnalysisPhase } from '../state/analysisStore';
import { exportActions } from '../state/exportStore';
import { useWorkspacePhase, workspaceActions } from '../state/workspaceStore';
import { DatasetFacts } from './DatasetFacts';

export type WorkspaceHeaderProps = React.ComponentProps<'header'>;

export function WorkspaceHeader({
  className = '',
  ...props
}: WorkspaceHeaderProps) {
  const isReady = useWorkspacePhase().status === 'ready';
  const hintId = useId();
  const analysisStatus = useAnalysisPhase().status;
  const isChecking = analysisStatus === 'idle' || analysisStatus === 'running';

  return (
    <header
      className={twMerge(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-x-6',
        className
      )}
      {...props}
    >
      <h1 className="text-base font-semibold tracking-tight sm:text-lg">
        AI Data Cleanup Assistant
      </h1>
      {isReady && (
        <>
          <DatasetFacts className="order-last w-full sm:order-none sm:w-auto sm:flex-1" />
          <div className="flex items-center gap-2">
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
              Export
            </Button>
            {isChecking && (
              <span id={hintId} className="sr-only">
                {EXPORT_WAITS_FOR_CHECKS}
              </span>
            )}
          </div>
        </>
      )}
    </header>
  );
}

const EXPORT_WAITS_FOR_CHECKS = 'Export is available when the checks finish.';
