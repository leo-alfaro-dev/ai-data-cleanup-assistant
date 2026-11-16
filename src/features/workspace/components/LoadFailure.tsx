import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { loadFailureCopy } from '../loadFailureCopy';
import type { FailurePanelProps } from './FailurePanel';
import { FailurePanel } from './FailurePanel';

export type LoadFailureProps = Omit<FailurePanelProps, 'title' | 'children'> & {
  fileName: string;
  reason: LoadFailureReason;
};

export function LoadFailure({ fileName, reason, ...props }: LoadFailureProps) {
  return (
    <FailurePanel role="alert" title={`Could not load ${fileName}`} {...props}>
      <p className="text-text-secondary">{loadFailureCopy[reason]}</p>
    </FailurePanel>
  );
}
