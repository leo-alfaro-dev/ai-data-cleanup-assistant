import { twMerge } from 'tailwind-variants';
import type { PreviewEntry } from '../state/previewEntry';
import { ChangeCounts } from './ChangeCounts';
import { ExamplePairs } from './ExamplePairs';
import { IssueExamplesSkeleton } from './IssueExamplesSkeleton';

export type PreviewSummaryProps = React.ComponentProps<'div'> & {
  entry: PreviewEntry | undefined;
};

export function PreviewSummary({
  entry,
  className = '',
  ...props
}: PreviewSummaryProps) {
  return (
    <div className={twMerge('flex flex-col gap-2', className)} {...props}>
      {(entry === undefined || entry.status === 'loading') && (
        <IssueExamplesSkeleton />
      )}
      {entry?.status === 'failed' && (
        <p className="text-sm text-text-secondary">
          The preview could not be built.
        </p>
      )}
      {entry?.status === 'ready' && (
        <>
          <ChangeCounts counts={entry.preview.counts} className="block" />
          <ExamplePairs examples={entry.preview.examples} />
        </>
      )}
    </div>
  );
}
