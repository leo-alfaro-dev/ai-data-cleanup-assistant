import { useId } from 'react';
import { tv } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';
import type { RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Issue } from '@/engine/issues/issue';
import { isBlank } from '@/engine/values/isBlank';
import { reviewActions, useFocusedRow } from '../state/reviewStore';
import { useRow } from '../state/useRow';

export type AffectedRowItemProps = React.ComponentProps<'button'> & {
  issue: Issue;
  rowId: RowId;
};

export function AffectedRowItem({
  issue,
  rowId,
  className = '',
  ...props
}: AffectedRowItemProps) {
  const valueId = useId();
  const row = useRow(rowId);
  const isFocused = useFocusedRow() === rowId;
  const text =
    row === undefined
      ? '…'
      : issue.column === null
        ? row
            .filter((value) => !isBlank(value))
            .slice(0, PREVIEW_VALUE_COUNT)
            .join(' · ')
        : (row[issue.column] ?? '');

  return (
    <button
      type="button"
      aria-label={`Show row ${toRowNumber(rowId)} in the grid`}
      aria-describedby={valueId}
      aria-current={isFocused ? 'true' : undefined}
      className={affectedRowItem({ isFocused, className })}
      onClick={() => reviewActions.jumpToRow(rowId)}
      {...props}
    >
      <span className="w-14 shrink-0 text-text-secondary tabular-nums">
        {toRowNumber(rowId)}
      </span>
      <VisibleValue
        id={valueId}
        value={text}
        className="min-w-0 overflow-hidden text-ellipsis"
      />
    </button>
  );
}

const PREVIEW_VALUE_COUNT = 3;

const affectedRowItem = tv({
  base: 'flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
  variants: { isFocused: { true: 'bg-muted', false: '' } },
});
