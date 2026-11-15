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

  it('puts the rows of a group side by side, under their row numbers', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    expect(
      screen.getByRole('columnheader', { name: 'Row 2' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Row 3' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /Rows 2, 3/ })
    ).toBeInTheDocument();
  });

  it('marks only the cells of the column where the rows differ', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    const city = rowOf('city');
    const email = rowOf('email');

    for (const cell of within(city).getAllByRole('cell')) {
      expect(cell).toHaveClass('bg-duplicate/20');
    }
    for (const cell of within(email).getAllByRole('cell')) {
      expect(cell).not.toHaveClass('bg-duplicate/20');
    }
    expect(cellOf({ column: 'name', index: 0 })).not.toHaveClass(
      'bg-duplicate/20'
    );
  });

  it('shows a difference nobody can see in plain text, as a trailing space', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(2)]} />);

    const first = cellOf({ column: 'name', index: 0 });
    const second = cellOf({ column: 'name', index: 1 });

    expect(first).toHaveClass('bg-duplicate/20');
    expect(second).toHaveClass('bg-duplicate/20');
    expect(within(first).queryByRole('img')).not.toBeInTheDocument();
    expect(
      within(second).getByRole('img', { name: 'space' })
    ).toBeInTheDocument();
  });

  it('marks a difference with weight and a word for screen readers, not only with color', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    const different = cellOf({ column: 'city', index: 0 });
    const same = cellOf({ column: 'email', index: 0 });

    expect(different).toHaveClass('font-semibold');
    expect(within(different).getByText('differs')).toBeInTheDocument();
    expect(same).not.toHaveClass('font-semibold');
    expect(within(same).queryByText('differs')).not.toBeInTheDocument();
  });

  it('marks nothing when the rows are identical', () => {
    seedWorkspace('name,email', 'Ada,a@example.com', 'Ada,a@example.com');

    render(<DuplicateGroup rows={[toRowId(0), toRowId(1)]} />);

    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).not.toHaveClass('bg-duplicate/20');
    }
  });

  it('shows a row whose chunk has not arrived as an ellipsis', () => {
    render(<DuplicateGroup rows={[toRowId(0), toRowId(50_000)]} />);

    expect(screen.getAllByText('…')).toHaveLength(3);
    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).not.toHaveClass('bg-duplicate/20');
    }
  });
});

function rowOf(column: string): HTMLElement {
  const row = screen.getByRole('rowheader', { name: column }).closest('tr');
  if (!row) throw new Error(`No table row for ${column}`);

  return row;
}

function cellOf({
  column,
  index,
}: {
  column: string;
  index: number;
}): HTMLElement {
  const cell = within(rowOf(column)).getAllByRole('cell')[index];
  if (!cell) throw new Error(`No cell ${index} for ${column}`);

  return cell;
}
