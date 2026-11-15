import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { twMerge } from 'tailwind-variants';
import type { Issue } from '@/engine/issues/issue';
import { countOf } from '@/lib/countOf';
import { AffectedRowItem } from './AffectedRowItem';

export type AffectedRowsProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

const ITEM_HEIGHT = 32;

export function AffectedRows({
  issue,
  className = '',
  ...props
}: AffectedRowsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: issue.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 8,
  });

  return (
    <div
      className={twMerge('flex min-h-0 flex-col gap-1', className)}
      {...props}
    >
      <h4 className="text-xs font-medium text-text-secondary">
        Affected {countOf({ count: issue.rows.length, noun: 'row' })}
      </h4>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto rounded-md border border-border"
      >
        <div
          role="list"
          aria-label="Affected rows"
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map(({ index, start }) => {
            const rowId = issue.rows[index];
            if (rowId === undefined) return null;

            return (
              <div
                key={rowId}
                role="listitem"
                className="absolute inset-x-0 top-0"
                style={{
                  height: ITEM_HEIGHT,
                  transform: `translateY(${start}px)`,
                }}
              >
                <AffectedRowItem issue={issue} rowId={rowId} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
