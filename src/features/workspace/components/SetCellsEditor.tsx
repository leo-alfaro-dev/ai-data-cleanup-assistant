import { twMerge } from 'tailwind-variants';
import type { SetCells } from '@/engine/changes/change';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import { useFacts } from '../state/workspaceStore';
import { toColumnLabel } from '../toColumnLabel';

export type SetCellsEditorProps = Omit<
  React.ComponentProps<'div'>,
  'onChange'
> & {
  draft: SetCells;
  onChange: (change: SetCells) => void;
};

const MAX_SHOWN_CELLS = 20;

export function SetCellsEditor({
  draft,
  onChange,
  className = '',
  ...props
}: SetCellsEditorProps) {
  const { columns } = useFacts();
  const shown = draft.cells.slice(0, MAX_SHOWN_CELLS);

  return (
    <div className={twMerge('flex flex-col gap-2', className)} {...props}>
      <ul aria-label="Cells to correct" className="flex flex-col gap-2">
        {shown.map(({ rowId, column, value }, index) => (
          <li key={`${rowId}:${column}`}>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Row {toRowNumber(rowId)}, {toColumnLabel({ columns, column })}
              <input
                value={value}
                spellCheck={false}
                className="h-8 rounded-md border border-border bg-surface px-2 font-mono text-sm font-normal text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onChange={(event) =>
                  onChange({
                    ...draft,
                    cells: draft.cells.map((cell, position) =>
                      position === index
                        ? { ...cell, value: event.target.value }
                        : cell
                    ),
                  })
                }
              />
            </label>
          </li>
        ))}
      </ul>
      {draft.cells.length > MAX_SHOWN_CELLS && (
        <p className="text-xs text-text-secondary">
          Showing {MAX_SHOWN_CELLS} of {draft.cells.length} cells. The others
          keep the suggested value.
        </p>
      )}
    </div>
  );
}
