import { memo } from 'react';
import { tv } from 'tailwind-variants';
import { cleanCell } from '@/engine/changes/cleanCell';
import type { RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Issue } from '@/engine/issues/issue';
import { memoizeByReference } from '@/lib/memoizeByReference';
import { useFocusedRow, useReviewView } from '../../state/reviewStore';
import { useCleanPlan } from '../../state/useCleanPlan';
import { useRow } from '../../state/useRow';
import { useSelectedIssue } from '../../state/useSelectedIssue';
import type { ColumnLayout } from './columnLayout';
import { DataGridCell } from './DataGridCell';
import { DataGridRowSkeleton } from './DataGridRowSkeleton';
import { ROW_HEIGHT, ROW_NUMBER_WIDTH } from './gridLayout';

export type DataGridRowProps = React.ComponentProps<'div'> & {
  rowId: RowId;
  top: number;
  width: number;
  columns: readonly ColumnLayout[];
};

export const DataGridRow = memo(function DataGridRow({
  rowId,
  top,
  width,
  columns,
  className = '',
  style,
  ...props
}: DataGridRowProps) {
  const row = useRow(rowId);
  const plan = useCleanPlan();
  const view = useReviewView();
  const focusedRow = useFocusedRow();
  const issue = useSelectedIssue();

  if (!row) {
    return <DataGridRowSkeleton top={top} width={width} columns={columns} />;
  }

  const isFocused = focusedRow === rowId;
  const isRemoved = view === 'cleaned' && plan.removedRows.has(rowId);
  const isIssueRow = issue !== undefined && toRowSet(issue).has(rowId);
  const isWholeRowIssue = isIssueRow && issue?.column === null;

  return (
    <div
      role="row"
      aria-rowindex={toRowNumber(rowId)}
      aria-current={isFocused ? 'true' : undefined}
      className={dataGridRow({ isFocused, className })}
      style={{ top, width, height: ROW_HEIGHT, ...style }}
      {...props}
    >
      <div
        role="rowheader"
        aria-colindex={1}
        className={rowHeader({ isHighlighted: isWholeRowIssue, isFocused })}
        style={{ width: ROW_NUMBER_WIDTH }}
      >
        {isWholeRowIssue && (
          <span aria-hidden className="absolute inset-0 bg-highlight" />
        )}
        <span className="relative">{toRowNumber(rowId)}</span>
        {isRemoved && <span className="sr-only">, removed</span>}
      </div>
      {columns.map(({ column, left, width: columnWidth, isNumeric }) => {
        const original = row[column.key] ?? '';
        const cleaned =
          view === 'cleaned'
            ? cleanCell({ plan, rowId, column: column.key, value: original })
            : { isChanged: false as const, value: original };
        const isIssueCell =
          isIssueRow &&
          (issue?.column === null || issue?.column === column.key);

        return (
          <DataGridCell
            key={column.key}
            aria-colindex={column.key + 2}
            value={cleaned.value}
            isNumeric={isNumeric}
            isRemoved={isRemoved}
            changedFrom={cleaned.isChanged ? original : null}
            isHighlighted={isIssueCell}
            left={left}
            width={columnWidth}
          />
        );
      })}
    </div>
  );
});

const toRowSet = memoizeByReference(
  (issue: Issue): ReadonlySet<RowId> => new Set(issue.rows)
);

const dataGridRow = tv({
  base: 'absolute left-0 flex',
  variants: {
    isFocused: {
      true: 'z-10 outline-2 -outline-offset-2 outline-primary',
      false: '',
    },
  },
});

// Sticky, so it stays opaque: the highlight is a layer over the wash, not its background.
const rowHeader = tv({
  base: 'sticky left-0 z-10 flex items-center justify-end border-r border-b border-r-border-strong border-b-border bg-wash px-2 text-xs text-text-secondary tabular-nums',
  variants: {
    isHighlighted: { true: 'text-text-primary', false: '' },
    isFocused: { true: 'font-semibold text-text-primary', false: '' },
  },
});
