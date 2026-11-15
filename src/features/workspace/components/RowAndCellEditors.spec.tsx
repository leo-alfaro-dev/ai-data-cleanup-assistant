import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MergeRows, SetCells } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { seedWorkspace } from '../testing/seedWorkspace';
import { MergeRowsEditor } from './MergeRowsEditor';
import { SetCellsEditor } from './SetCellsEditor';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const column = toColumnKey(1);
const [a, b, c] = [toRowId(0), toRowId(1), toRowId(2)];

describe('MergeRowsEditor', () => {
  const original: MergeRows = {
    kind: 'mergeRows',
    keep: a,
    remove: [b, c],
    values: [{ column, from: b }],
  };

  beforeEach(() => {
    seedWorkspace('name,city', 'Ada,', 'Ada,Paris', 'Ada,Rome');
  });

  it('keeps another row, removing the others, and shows each row’s value to take', async () => {
    const onChange = vi.fn();
    render(
      <MergeRowsEditor
        original={original}
        draft={original}
        onChange={onChange}
      />
    );
    expect(
      screen.getByRole('option', { name: 'Row 2: (empty)' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Row 3: Paris' })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Row 3' }));

    expect(onChange).toHaveBeenCalledWith({
      ...original,
      keep: b,
      remove: [a, c],
    });
  });

  it('takes a column’s value from another row', async () => {
    const onChange = vi.fn();
    render(
      <MergeRowsEditor
        original={original}
        draft={original}
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Value for/ }),
      'Row 4: Rome'
    );

    expect(onChange).toHaveBeenCalledWith({
      ...original,
      values: [{ column, from: c }],
    });
  });
});

describe('SetCellsEditor', () => {
  const draft: SetCells = {
    kind: 'setCells',
    cells: [
      { rowId: a, column, value: 'x@example.com' },
      { rowId: b, column, value: 'y@example.com' },
    ],
  };

  beforeEach(() => {
    seedWorkspace('name,city', 'Ada,x', 'Bo,y');
  });

  it('types a value into one cell and leaves the others', async () => {
    const onChange = vi.fn();
    render(<SetCellsEditor draft={draft} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: /Row 3/ }), '!');

    expect(onChange).toHaveBeenCalledWith({
      kind: 'setCells',
      cells: [draft.cells[0], { ...draft.cells[1], value: 'y@example.com!' }],
    });
  });

  it('says how many cells it does not show when there are many', () => {
    const many: SetCells = {
      kind: 'setCells',
      cells: Array.from({ length: 25 }, (_, row) => ({
        rowId: toRowId(row),
        column,
        value: 'v',
      })),
    };

    render(<SetCellsEditor draft={many} onChange={vi.fn()} />);

    expect(screen.getAllByRole('textbox')).toHaveLength(20);
    expect(screen.getByText(/Showing 20 of 25 cells/)).toBeInTheDocument();
  });
});
