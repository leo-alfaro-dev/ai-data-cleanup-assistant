import { RxReload } from 'react-icons/rx';
import { Button } from '@/components/Button';
import { analysisActions } from '../state/analysisStore';
import type { FailurePanelProps } from './FailurePanel';
import { FailurePanel } from './FailurePanel';

export type AnalysisFailureProps = Omit<
  FailurePanelProps,
  'title' | 'children'
>;

export function AnalysisFailure(props: AnalysisFailureProps) {
  return (
    <FailurePanel title="The checks could not run" {...props}>
      <div className="flex flex-col items-start gap-3">
        <p className="text-text-secondary">
          The rows are listed, but the file has not been checked. Run the checks
          again.
        </p>
        <Button onClick={() => void analysisActions.run()}>
          <RxReload aria-hidden className="size-3.5" />
          Retry
        </Button>
      </div>
    </FailurePanel>
  );
}
