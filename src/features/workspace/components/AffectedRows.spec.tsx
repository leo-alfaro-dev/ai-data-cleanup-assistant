import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { reviewActions, reviewStore$ } from '../state/reviewStore';
import { elementAt } from '../testing/elementAt';
import { makeIssue } from '../testing/makeIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedWorkspace } from '../testing/seedWorkspace';
import { AffectedRows } from './AffectedRows';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout({ height: 200 });

describe('AffectedRows', () => {
  beforeEach(() => {
    seedWorkspace('name,city', 'Ada,Paris', 'Bo ,Rome', 'Cy,Oslo', 'Di, Lima');
  });

  it('lists the rows of the issue by row number, with the value of its column', () => {
    const issue = makeIssue({
      id: 'a',
      rows: [1, 3],
      column: toColumnKey(1),
    });

    render(<AffectedRows issue={issue} />);

    expect(screen.getByText('Affected 2 rows')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(elementAt(items, 0)).getByText('3')).toBeInTheDocument();
    expect(within(elementAt(items, 0)).getByText('Rome')).toBeInTheDocument();
    expect(within(elementAt(items, 1)).getByText('5')).toBeInTheDocument();
    expect(
      within(elementAt(items, 1)).getByRole('img', { name: 'space' })
    ).toBeInTheDocument();
  });

  it('shows the first values of the row when the issue covers whole rows', () => {
    const issue = makeIssue({ id: 'a', rows: [0], column: null });

    render(<AffectedRows issue={issue} />);

    expect(screen.getByText('Ada · Paris')).toBeInTheDocument();
  });

  it('asks the grid to show the row that is chosen, and marks it', async () => {
    const user = userEvent.setup();
    const scrollToRow = vi.fn();
    reviewActions.registerGrid(scrollToRow);
    const issue = makeIssue({ id: 'a', rows: [1, 3], column: toColumnKey(1) });
    const { rerender } = render(<AffectedRows issue={issue} />);

    await user.click(
      screen.getByRole('button', { name: 'Show row 5 in the grid' })
    );
    rerender(<AffectedRows issue={issue} />);

    expect(scrollToRow).toHaveBeenCalledWith(toRowId(3));
    expect(reviewStore$.getState().focusedRow).toBe(3);
    expect(
      screen.getByRole('button', { name: 'Show row 5 in the grid' })
    ).toHaveAttribute('aria-current', 'true');
  });

  it('renders only the rows that fit when the issue has thousands', () => {
    const rows = Array.from({ length: 5_000 }, (_, index) => index);
    const issue = makeIssue({ id: 'a', rows, column: toColumnKey(1) });

    render(<AffectedRows issue={issue} />);

    expect(screen.getByText('Affected 5,000 rows')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThan(40);
  });
});
