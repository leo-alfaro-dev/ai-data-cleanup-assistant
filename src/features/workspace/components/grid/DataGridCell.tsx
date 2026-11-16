import { tv } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';

export type DataGridCellProps = React.ComponentProps<'div'> & {
  value: string;
  isNumeric: boolean;
  isRemoved: boolean;
  changedFrom: string | null;
  isHighlighted: boolean;
  left: number;
  width: number;
};

export function DataGridCell({
  value,
  isNumeric,
  isRemoved,
  changedFrom,
  isHighlighted,
  left,
  width,
  className = '',
  style,
  ...props
}: DataGridCellProps) {
  return (
    <div
      role="cell"
      className={dataGridCell({
        isNumeric,
        isRemoved,
        isChanged: changedFrom !== null,
        isHighlighted,
        className,
      })}
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
    isChanged: {
      true: 'border-l-2 border-l-added font-medium text-added',
      false: '',
    },
    isRemoved: { true: 'text-text-secondary line-through', false: '' },
    isHighlighted: { true: 'bg-highlight', false: '' },
  },
});
