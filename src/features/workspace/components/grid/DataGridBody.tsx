import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import type { RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import { useProfile } from '../../state/analysisStore';
import { reviewActions } from '../../state/reviewStore';
import { useGridRowIds } from '../../state/useGridRowIds';
import { useFacts } from '../../state/workspaceStore';
import { DataGridHeader } from './DataGridHeader';
import { DataGridRow } from './DataGridRow';
import { HEADER_HEIGHT, ROW_HEIGHT, ROW_NUMBER_WIDTH } from './gridLayout';
import { toColumnLayouts } from './toColumnLayouts';
import { toGridIndex } from './toGridIndex';

export type DataGridBodyProps = React.ComponentProps<'div'> & {
  scrollElement: HTMLElement;
  widths: readonly number[];
};

// A virtualizer does not recompute sizes when its estimate changes, so the grid mounts this
// with a new key whenever the column widths change.
export function DataGridBody({
  scrollElement,
  widths,
  className = '',
  style,
  ...props
}: DataGridBodyProps) {
  const { columns, rowCount } = useFacts();
  const profile = useProfile();
  const gridRowIds = useGridRowIds();

  const layouts = useMemo(
    () => toColumnLayouts({ columns, widths, profile }),
    [columns, widths, profile]
  );
  const rowVirtualizer = useVirtualizer({
    count: gridRowIds ? gridRowIds.length : rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin: HEADER_HEIGHT,
  });
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: layouts.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => layouts[index]?.width ?? 0,
    overscan: 2,
    scrollMargin: ROW_NUMBER_WIDTH,
  });

  const scrollToRow = useCallback(
    (rowId: RowId) => {
      const index = toGridIndex({ rowId, gridRowIds });
      if (index >= 0) rowVirtualizer.scrollToIndex(index, { align: 'center' });
    },
    [gridRowIds, rowVirtualizer]
  );
  useEffect(() => reviewActions.registerGrid(scrollToRow), [scrollToRow]);

  const virtualColumns = columnVirtualizer.getVirtualItems();
  const visibleColumns = useMemo(
    () => virtualColumns.flatMap(({ index }) => layouts[index] ?? []),
    [virtualColumns, layouts]
  );
  const totalWidth = ROW_NUMBER_WIDTH + columnVirtualizer.getTotalSize();

  return (
    <div
      className={twMerge('relative', className)}
      style={{
        width: totalWidth,
        height: HEADER_HEIGHT + rowVirtualizer.getTotalSize(),
        ...style,
      }}
      {...props}
    >
      <DataGridHeader
        columns={visibleColumns}
        allColumns={columns}
        width={totalWidth}
      />
      <div role="rowgroup">
        {rowVirtualizer.getVirtualItems().map(({ index, start }) => (
          <DataGridRow
            key={index}
            rowId={gridRowIds?.[index] ?? toRowId(index)}
            top={start}
            width={totalWidth}
            columns={visibleColumns}
          />
        ))}
      </div>
    </div>
  );
}
