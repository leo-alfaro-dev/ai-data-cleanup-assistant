import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { seedWorkspace } from '../testing/seedWorkspace';
import { DuplicateGroup } from './DuplicateGroup';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

describe('DuplicateGroup', () => {
  beforeEach(() => {
    seedWorkspace(
      'name,email,city',
      'Ada,ada@example.com,Paris',
      'Ada,ada@example.com,Rome',
      'Ada ,ada@example.com,Paris',
      'Bo,bo@example.com,Oslo'
    );
  });

  it('puts each row of a group on its own line, as in the grid, under the column names', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    expect(
      screen.getByRole('table', { name: /Rows 2, 3/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '3' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent)
    ).toEqual(['Row', 'name', 'email', 'city']);
  });

  it('names the columns that differ, or says the rows are identical', () => {
    const { unmount } = render(
      <DuplicateGroup rows={[toRowId(0), toRowId(1)]} />
    );
    expect(
      screen.getByRole('table', { name: 'Rows 2, 3 · differ in “city”' })
    ).toBeInTheDocument();
    unmount();

    seedWorkspace('name,email', 'Ada,a@example.com', 'Ada,a@example.com');
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    expect(
      screen.getByRole('table', { name: 'Rows 2, 3 · identical' })
    ).toBeInTheDocument();
  });

  it('marks only the cells of the column where the rows differ', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    for (const row of [2, 3]) {
      expect(cellOf({ column: 'city', row })).toHaveClass('bg-highlight');
      expect(cellOf({ column: 'email', row })).not.toHaveClass('bg-highlight');
    }
    expect(cellOf({ column: 'name', row: 2 })).not.toHaveClass('bg-highlight');
  });

  it('shows a difference nobody can see in plain text, as a trailing space', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(2)]} />);

    const first = cellOf({ column: 'name', row: 2 });
    const second = cellOf({ column: 'name', row: 4 });

    expect(first).toHaveClass('bg-highlight');
    expect(second).toHaveClass('bg-highlight');
    expect(within(first).queryByRole('img')).not.toBeInTheDocument();
    expect(
      within(second).getByRole('img', { name: 'space' })
    ).toBeInTheDocument();
  });

  it('marks a difference with weight and a word for screen readers, not only with color', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    const different = cellOf({ column: 'city', row: 2 });
    const same = cellOf({ column: 'email', row: 2 });

    expect(different).toHaveClass('font-semibold');
    expect(within(different).getByText('differs')).toBeInTheDocument();
    expect(same).not.toHaveClass('font-semibold');
    expect(within(same).queryByText('differs')).not.toBeInTheDocument();
  });

  it('marks nothing when the rows are identical', () => {
    seedWorkspace('name,email', 'Ada,a@example.com', 'Ada,a@example.com');

    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).not.toHaveClass('bg-highlight');
    }
  });

  it('shows a row whose chunk has not arrived as an ellipsis', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(50_000)]} />);

    expect(screen.getAllByText('…')).toHaveLength(3);
    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).not.toHaveClass('bg-highlight');
    }
  });
});

// The first column header names the row numbers, so cells start one column later.
function cellOf({ column, row }: { column: string; row: number }): HTMLElement {
  const headers = screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent);
  const line = screen
    .getByRole('rowheader', { name: String(row) })
    .closest('tr');
  if (!line) throw new Error(`No table row for row ${row}`);
  const cell = within(line).getAllByRole('cell')[headers.indexOf(column) - 1];
  if (!cell) throw new Error(`No ${column} cell in row ${row}`);

  return cell;
}
