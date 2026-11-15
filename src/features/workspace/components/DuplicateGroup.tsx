import { tv, twMerge } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';
import type { RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
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

  return (
    <table
      className={twMerge(
        'w-full table-fixed border-collapse text-xs',
        className
      )}
      {...props}
    >
      <caption className="pb-1 text-left text-xs font-medium text-text-secondary">
        Rows {rows.map(toRowNumber).join(', ')}
      </caption>
      <thead>
        <tr>
          <th scope="col" className="w-28 p-1 text-left font-medium">
            Column
          </th>
          {rows.map((rowId) => (
            <th
              key={rowId}
              scope="col"
              className="p-1 text-left font-medium tabular-nums"
            >
              Row {toRowNumber(rowId)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map(({ key }) => {
          const cells = values.map((row) => row?.[key]);
          const loaded = cells.filter((cell) => cell !== undefined);
          const isDifferent = loaded.some((cell) => cell !== loaded[0]);

          return (
            <tr key={key} className="border-t border-border">
              <th
                scope="row"
                className="truncate p-1 text-left font-normal text-text-secondary"
              >
                {toColumnLabel({ columns, column: key })}
              </th>
              {cells.map((cell, index) => (
                <td
                  key={rows[index]}
                  className={duplicateCell({ isDifferent })}
                >
                  {cell === undefined ? (
                    '…'
                  ) : (
                    <>
                      <VisibleValue
                        value={cell}
                        className="block overflow-hidden text-ellipsis"
                      />
                      {isDifferent && <span className="sr-only">differs</span>}
                    </>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const duplicateCell = tv({
  base: 'p-1 font-mono',
  variants: {
    isDifferent: { true: 'bg-duplicate/20 font-semibold', false: '' },
  },
});
