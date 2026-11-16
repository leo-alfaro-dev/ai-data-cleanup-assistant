import { DropdownMenu } from 'radix-ui';
import { useMemo } from 'react';
import { RxCheck, RxChevronDown } from 'react-icons/rx';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import { eyebrow } from '@/components/eyebrow';
import type { Confidence, IssueCategory } from '@/engine/issues/issue';
import { CONFIDENCES } from '@/engine/issues/issue';
import { formatCount } from '@/lib/formatCount';
import { listBulkAcceptable } from '../state/listBulkAcceptable';
import { reviewActions, useDecisions } from '../state/reviewStore';
import { useIssues } from '../state/useIssues';

export type BulkApplyMenuProps = ButtonProps & {
  category: IssueCategory;
};

// Each option applies every open suggestion at least as sure as its level.
// A level that would apply no more than the one above it is left out.
export function BulkApplyMenu({
  category,
  className = '',
  ...props
}: BulkApplyMenuProps) {
  const issues = useIssues();
  const decisions = useDecisions();
  const options = useMemo(() => {
    const counted = CONFIDENCES.map((minimumConfidence) => ({
      minimumConfidence,
      count: listBulkAcceptable({
        issues,
        decisions,
        category,
        minimumConfidence,
      }).length,
    }));

    return counted.filter(
      ({ count }, index) => count > (counted[index - 1]?.count ?? 0)
    );
  }, [issues, decisions, category]);
  const total = options.at(-1)?.count ?? 0;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="tint"
          disabled={total === 0}
          className={className}
          {...props}
        >
          <RxCheck aria-hidden className="size-3.5" />
          Apply suggestions
          <RxChevronDown aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-30 flex w-72 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-xl shadow-text-primary/10 focus:outline-none"
        >
          <DropdownMenu.Label
            className={eyebrow({ className: 'px-2.5 pt-1.5 pb-1' })}
          >
            Apply
          </DropdownMenu.Label>
          {options.map(({ minimumConfidence, count }) => (
            <DropdownMenu.Item
              key={minimumConfidence}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-2.5 py-2 text-text-primary outline-none data-highlighted:bg-wash"
              onSelect={() =>
                reviewActions.acceptAll({ category, minimumConfidence })
              }
            >
              <span>
                {count === total
                  ? 'All of them'
                  : OPTION_COPY[minimumConfidence]}
              </span>{' '}
              <span className="text-text-secondary tabular-nums">
                {formatCount(count)}
              </span>
            </DropdownMenu.Item>
          ))}
          <p className="mt-1 border-t border-border px-2.5 pt-2 pb-1.5 text-xs text-text-secondary">
            Each card shows how sure its check or the AI is.
          </p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const OPTION_COPY: Record<Confidence, string> = {
  certain: 'Only the certain ones',
  high: 'Certain and very sure',
  medium: 'All but the unsure ones',
  low: 'All of them',
};
