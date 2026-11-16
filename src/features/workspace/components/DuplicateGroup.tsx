import { tv, twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
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
      <caption className={eyebrow({ className: 'pb-1.5 text-left' })}>
        Rows {rows.map(toRowNumber).join(', ')}
      </caption>
      <thead>
        <tr className="bg-wash">
          <th scope="col" className="w-28 px-2 py-1.5 text-left font-semibold">
            Column
          </th>
          {rows.map((rowId) => (
            <th
              key={rowId}
              scope="col"
              className="px-2 py-1.5 text-left font-semibold tabular-nums"
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
            <tr key={key} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="truncate px-2 py-1.5 text-left font-normal text-text-secondary"
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
  base: 'px-2 py-1.5 font-mono',
  variants: {
    isDifferent: { true: 'bg-highlight font-semibold', false: '' },
  },
});
