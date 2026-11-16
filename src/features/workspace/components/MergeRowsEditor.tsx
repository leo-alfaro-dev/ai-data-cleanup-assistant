import { useId } from 'react';
import { twMerge } from 'tailwind-variants';
import { Select } from '@/components/Select';
import type { MergeRows } from '@/engine/changes/change';
import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import { useFacts } from '../state/workspaceStore';
import { toColumnLabel } from '../toColumnLabel';
import { useRow } from '../state/useRow';

export type MergeRowsEditorProps = Omit<
  React.ComponentProps<'div'>,
  'onChange'
> & {
  original: MergeRows;
  draft: MergeRows;
  onChange: (change: MergeRows) => void;
};

export function MergeRowsEditor({
  original,
  draft,
  onChange,
  className = '',
  ...props
}: MergeRowsEditorProps) {
  const { columns } = useFacts();
  const groupName = useId();
  const rows = [original.keep, ...original.remove];
  const fromOf = (column: ColumnKey) =>
    draft.values.find((choice) => choice.column === column)?.from ?? draft.keep;

  return (
    <div className={twMerge('flex flex-col gap-3', className)} {...props}>
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <legend className="mb-1.5 text-xs font-medium text-text-secondary">
          Row to keep
        </legend>
        {rows.map((rowId) => (
          <label
            key={rowId}
            className="flex cursor-pointer items-center gap-1.5 text-sm"
          >
            <input
              type="radio"
              className="size-3.5 cursor-pointer accent-primary"
              name={groupName}
              checked={draft.keep === rowId}
              onChange={() =>
                onChange({
                  ...draft,
                  keep: rowId,
                  remove: rows.filter((other) => other !== rowId),
                })
              }
            />
            Row {toRowNumber(rowId)}
          </label>
        ))}
      </fieldset>
      {original.values.map(({ column }) => (
        <label
          key={column}
          className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary"
        >
          Value for {toColumnLabel({ columns, column })}
          <Select
            value={fromOf(column)}
            className="rounded-lg border-border-strong font-mono font-normal shadow-none"
            onChange={(event) => {
              const from = rows.find(
                (rowId) => String(rowId) === event.target.value
              );
              if (from === undefined) return;

              onChange({
                ...draft,
                values: draft.values
                  .filter((choice) => choice.column !== column)
                  .concat({ column, from }),
              });
            }}
          >
            {rows.map((rowId) => (
              <RowValueOption key={rowId} rowId={rowId} column={column} />
            ))}
          </Select>
        </label>
      ))}
    </div>
  );
}

function RowValueOption({
  rowId,
  column,
}: {
  rowId: RowId;
  column: ColumnKey;
}) {
  const value = useRow(rowId)?.[column] ?? '';

  return (
    <option value={rowId}>
      {`Row ${toRowNumber(rowId)}: ${value === '' ? '(empty)' : value}`}
    </option>
  );
}
