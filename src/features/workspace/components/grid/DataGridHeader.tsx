import { tv, twMerge } from 'tailwind-variants';
import type { Column } from '@/engine/dataset/dataset';
import { isBlank } from '@/engine/values/isBlank';
import { toColumnLabel } from '../../toColumnLabel';
import type { ColumnLayout } from './columnLayout';
import { HEADER_HEIGHT, ROW_NUMBER_WIDTH } from './gridLayout';

export type DataGridHeaderProps = React.ComponentProps<'div'> & {
  columns: readonly ColumnLayout[];
  allColumns: readonly Column[];
  width: number;
};

export function DataGridHeader({
  columns,
  allColumns,
  width,
  className = '',
  style,
  ...props
}: DataGridHeaderProps) {
  return (
    <div
      role="row"
      aria-rowindex={1}
      className={twMerge(
        'sticky top-0 z-20 border-b border-border-strong bg-wash text-xs font-semibold',
        className
      )}
      style={{ width, height: HEADER_HEIGHT, ...style }}
      {...props}
    >
      <div
        role="columnheader"
        aria-colindex={1}
        className="sticky left-0 z-10 flex h-full items-center justify-end border-r border-border-strong bg-wash px-2 font-medium text-text-secondary tabular-nums"
        style={{ width: ROW_NUMBER_WIDTH }}
      >
        Row
      </div>
      {columns.map(({ column, left, width: columnWidth, isNumeric }) => (
        <div
          key={column.key}
          role="columnheader"
          aria-colindex={column.key + 2}
          className={headerCell({ isNumeric })}
          style={{ left, width: columnWidth }}
        >
          <span className={headerLabel({ isUnnamed: isBlank(column.header) })}>
            {toColumnLabel({ columns: allColumns, column: column.key })}
          </span>
        </div>
      ))}
    </div>
  );
}

const headerCell = tv({
  base: 'absolute inset-y-0 flex items-center border-r border-border px-2',
  variants: { isNumeric: { true: 'justify-end', false: '' } },
});

const headerLabel = tv({
  base: 'min-w-0 truncate',
  variants: {
    isUnnamed: { true: 'font-normal text-text-secondary italic', false: '' },
  },
});
