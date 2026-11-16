import { twMerge } from 'tailwind-variants';
import type { PreviewCounts } from '@/engine/changes/changePreview';
import { countOf } from '@/lib/countOf';

export type ChangeCountsProps = React.ComponentProps<'span'> & {
  counts: PreviewCounts;
};

export function ChangeCounts({
  counts,
  className = '',
  ...props
}: ChangeCountsProps) {
  const changed = `Changes ${countOf({ count: counts.cells, noun: 'cell' })} in ${countOf({ count: counts.rows, noun: 'row' })}.`;
  const removed = `Removes ${countOf({ count: counts.removedRows, noun: 'row' })}.`;
  const text = (() => {
    if (counts.removedRows === 0) return changed;
    if (counts.cells === 0) return removed;

    return `${changed} ${removed}`;
  })();

  return (
    <span
      className={twMerge('text-sm font-medium tabular-nums', className)}
      {...props}
    >
      {text}
    </span>
  );
}
