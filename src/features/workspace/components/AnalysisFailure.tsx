import { RxExclamationTriangle } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { analysisActions } from '../state/analysisStore';

export type AnalysisFailureProps = React.ComponentProps<'div'>;

export function AnalysisFailure({
  className = '',
  ...props
}: AnalysisFailureProps) {
  return (
    <div
      className={twMerge(
        'flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <RxExclamationTriangle
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-danger"
        />
        <div className="flex flex-col gap-1">
          <p className="font-medium">The checks could not run</p>
          <p className="text-text-secondary">
            The rows are listed, but the file has not been checked. Run the
            checks again.
          </p>
        </div>
      </div>
      <Button className="self-start" onClick={() => void analysisActions.run()}>
        Retry
      </Button>
    </div>
  );
}
