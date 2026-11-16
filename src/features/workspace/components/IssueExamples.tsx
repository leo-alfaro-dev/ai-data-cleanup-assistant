import { twMerge } from 'tailwind-variants';
import type { Issue } from '@/engine/issues/issue';
import { usePreview } from '../state/previewStore';
import { ExamplePairs } from './ExamplePairs';
import { IssueExamplesSkeleton } from './IssueExamplesSkeleton';

export type IssueExamplesProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

export function IssueExamples({
  issue,
  className = '',
  ...props
}: IssueExamplesProps) {
  const entry = usePreview(issue.id);

  return (
    <div className={twMerge('flex flex-col gap-2', className)} {...props}>
      {(entry === undefined || entry.status === 'loading') && (
        <IssueExamplesSkeleton className="flex-row flex-wrap" />
      )}
      {entry?.status === 'failed' && (
        <p className="text-sm text-text-secondary">
          The preview could not be built.
        </p>
      )}
      {entry?.status === 'ready' && entry.preview.examples.length > 0 && (
        <ExamplePairs
          examples={entry.preview.examples}
          className="flex-row flex-wrap gap-x-5"
        />
      )}
    </div>
  );
}
