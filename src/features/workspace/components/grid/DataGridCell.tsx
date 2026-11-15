import { tv, twMerge } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';
import type { IssueCategory } from '@/engine/issues/issue';
import { categoryTone } from '../../categoryTone';

export type DataGridCellProps = React.ComponentProps<'div'> & {
  value: string;
  isNumeric: boolean;
  isRemoved: boolean;
  changedFrom: string | null;
  highlight: IssueCategory | null;
  left: number;
  width: number;
};

export function DataGridCell({
  value,
  isNumeric,
  isRemoved,
  changedFrom,
  highlight,
  left,
  width,
  className = '',
  style,
  ...props
}: DataGridCellProps) {
  const highlightClass = highlight
    ? categoryTone({ category: highlight }).highlight()
    : '';

  return (
    <div
      role="cell"
      className={twMerge(
        dataGridCell({ isNumeric, isRemoved, isChanged: changedFrom !== null }),
        highlightClass,
        className
      )}
      style={{ left, width, ...style }}
      {...props}
    >
      <VisibleValue
        value={value}
        className="block min-w-0 overflow-hidden text-ellipsis"
      />
      {changedFrom !== null && (
        <span className="sr-only">, changed from {changedFrom}</span>
      )}
    </div>
  );
}

const dataGridCell = tv({
  base: 'absolute inset-y-0 flex items-center border-r border-b border-border px-2 text-xs',
  variants: {
    isNumeric: { true: 'justify-end tabular-nums', false: '' },
    isRemoved: { true: 'text-text-secondary line-through', false: '' },
    isChanged: {
      true: 'border-l-2 border-l-added bg-added/10',
      false: '',
    },
  },
});
