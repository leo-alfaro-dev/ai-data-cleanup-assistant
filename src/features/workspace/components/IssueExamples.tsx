import { RxArrowRight } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';
import type { Issue } from '@/engine/issues/issue';
import { countOf } from '@/lib/countOf';
import { usePreview } from '../state/previewStore';
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
        <IssueExamplesSkeleton />
      )}
      {entry?.status === 'failed' && (
        <p className="text-sm text-text-secondary">
          The preview could not be built.
        </p>
      )}
      {entry?.status === 'ready' && (
        <>
          <p className="text-sm text-text-secondary tabular-nums">
            Changes{' '}
            {countOf({ count: entry.preview.counts.cells, noun: 'cell' })} in{' '}
            {countOf({ count: entry.preview.counts.rows, noun: 'row' })}.
            {entry.preview.counts.removedRows > 0 &&
              ` Removes ${countOf({ count: entry.preview.counts.removedRows, noun: 'row' })}.`}
          </p>
          <ul aria-label="Before and after" className="flex flex-col gap-1">
            {entry.preview.examples.map(({ before, after, cells }) => (
              <li
                key={`${before}\u0000${after}`}
                className="flex min-w-0 items-center gap-2 font-mono text-xs"
              >
                <VisibleValue
                  value={before}
                  className="min-w-0 truncate rounded-sm bg-removed/10 px-1.5 py-0.5 text-removed"
                />
                <RxArrowRight
                  aria-label="becomes"
                  role="img"
                  className="size-3.5 shrink-0 text-text-secondary"
                />
                <VisibleValue
                  value={after}
                  className="min-w-0 truncate rounded-sm bg-added/10 px-1.5 py-0.5 text-added"
                />
                {cells > 1 && (
                  <span className="shrink-0 text-text-secondary tabular-nums">
                    × {cells}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
