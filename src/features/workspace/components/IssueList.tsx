import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef } from 'react';
import { twMerge } from 'tailwind-variants';
import { useVisibleIssues } from '../state/useVisibleIssues';
import { IssueCard } from './IssueCard';

export type IssueListProps = React.ComponentProps<'div'>;

const ESTIMATED_CARD_HEIGHT = 156;

const CARD_GAP = 8;

export function IssueList({ className = '', ...props }: IssueListProps) {
  const issues = useVisibleIssues();
  const scrollRef = useRef<HTMLDivElement>(null);
  const getItemKey = useCallback(
    (index: number) => issues[index]?.id ?? index,
    [issues]
  );
  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    gap: CARD_GAP,
    overscan: 6,
    getItemKey,
  });

  return (
    <div
      ref={scrollRef}
      className={twMerge('min-h-0 flex-1 overflow-y-auto', className)}
      {...props}
    >
      <div
        role="list"
        aria-label="Issues"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map(({ index, key, start }) => {
          const issue = issues[index];
          if (!issue) return null;

          return (
            <div
              key={key}
              ref={virtualizer.measureElement}
              role="listitem"
              data-index={index}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${start}px)` }}
            >
              <IssueCard issue={issue} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
