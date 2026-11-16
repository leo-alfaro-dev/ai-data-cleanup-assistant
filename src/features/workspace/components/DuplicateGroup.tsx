import { tv, twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
import { VisibleValue } from '@/components/VisibleValue';
import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import { countOf } from '@/lib/countOf';
import { quote } from '@/lib/quote';
import { useRows } from '../state/useRows';
import { useFacts } from '../state/workspaceStore';
import { toColumnLabel } from '../toColumnLabel';

export type DuplicateGroupProps = React.ComponentProps<'table'> & {
  rows: readonly RowId[];
};

export function DuplicateGroup({
  rows,
  className = '',
  ...props
}: DuplicateGroupProps) {
  const { columns } = useFacts();
  const values = useRows(rows);
  const isLoaded = values.every((row) => row !== undefined);
  const differing = new Set<ColumnKey>(
    columns
      .filter(({ key }) => {
        const loaded = values.flatMap((row) =>
          row?.[key] === undefined ? [] : [row[key]]
        );
        return loaded.some((cell) => cell !== loaded[0]);
      })
      .map(({ key }) => key)
  );
  const labelOf = (column: ColumnKey) => toColumnLabel({ columns, column });

  return (
    <table className={twMerge('border-collapse text-xs', className)} {...props}>
      <caption className="pb-1.5 text-left">
        <span className={eyebrow()}>
          Rows {rows.map(toRowNumber).join(', ')}
        </span>
        {isLoaded && (
          <>
            {' '}
            <span className="text-text-secondary">
              · {differenceCopy({ differing: [...differing], labelOf })}
            </span>
          </>
        )}
      </caption>
      <thead>
        <tr className="bg-wash">
          <th
            scope="col"
            className="sticky left-0 bg-wash px-2 py-1.5 text-left font-semibold"
          >
            Row
          </th>
          {columns.map(({ key }) => (
            <th
              key={key}
              scope="col"
              className={headerCell({ isDifferent: differing.has(key) })}
            >
              {labelOf(key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((rowId, index) => (
          <tr key={rowId} className="border-b border-border last:border-b-0">
            <th
              scope="row"
              className="sticky left-0 bg-surface px-2 py-1.5 text-left font-normal text-text-secondary tabular-nums"
            >
              {toRowNumber(rowId)}
            </th>
            {columns.map(({ key }) => {
              const cell = values[index]?.[key];
              const isDifferent = differing.has(key);

              return (
                <td key={key} className={duplicateCell({ isDifferent })}>
                  {cell === undefined ? (
                    '…'
                  ) : (
                    <>
                      <VisibleValue
                        value={cell}
                        className="block max-w-64 overflow-hidden text-ellipsis"
                      />
                      {isDifferent && <span className="sr-only">differs</span>}
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function differenceCopy({
  differing,
  labelOf,
}: {
  differing: readonly ColumnKey[];
  labelOf: (column: ColumnKey) => string;
}): string {
  if (differing.length === 0) return 'identical';
  if (differing.length > MAX_NAMED_COLUMNS) {
    return `differ in ${countOf({ count: differing.length, noun: 'column' })}`;
  }

  return `differ in ${differing.map((column) => quote(labelOf(column))).join(', ')}`;
}

const MAX_NAMED_COLUMNS = 3;

const headerCell = tv({
  base: 'px-2 py-1.5 text-left font-semibold whitespace-nowrap',
  variants: {
    isDifferent: { true: 'text-primary', false: '' },
  },
});

const duplicateCell = tv({
  base: 'px-2 py-1.5 font-mono whitespace-nowrap',
  variants: {
    isDifferent: { true: 'bg-highlight font-semibold', false: '' },
  },
});
