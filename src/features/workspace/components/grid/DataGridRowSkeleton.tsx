import { twMerge } from 'tailwind-variants';
import { SkeletonBar } from '@/components/SkeletonBar';
import type { ColumnLayout } from './columnLayout';
import { ROW_HEIGHT, ROW_NUMBER_WIDTH } from './gridLayout';

export type DataGridRowSkeletonProps = React.ComponentProps<'div'> & {
  top: number;
  width: number;
  columns: readonly ColumnLayout[];
};

export function DataGridRowSkeleton({
  top,
  width,
  columns,
  className = '',
  style,
  ...props
}: DataGridRowSkeletonProps) {
  return (
    <div
      aria-hidden
      className={twMerge('absolute left-0 flex', className)}
      style={{ top, width, height: ROW_HEIGHT, ...style }}
      {...props}
    >
      <div
        className="sticky left-0 z-10 border-r border-b border-r-border-strong border-b-border bg-wash"
        style={{ width: ROW_NUMBER_WIDTH }}
      />
      {columns.map(({ column, left, width: columnWidth }) => (
        <div
          key={column.key}
          className="absolute inset-y-0 flex items-center border-r border-b border-border px-2"
          style={{ left, width: columnWidth }}
        >
          <SkeletonBar className="h-2.5 w-3/5 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
