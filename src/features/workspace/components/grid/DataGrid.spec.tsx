import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toIssueId } from '@/engine/issues/toIssueId';
import { analysisStore$ } from '../../state/analysisStore';
import { reviewActions, reviewStore$ } from '../../state/reviewStore';
import { workspaceStore$ } from '../../state/workspaceStore';
import { elementAt } from '../../testing/elementAt';
import { makeIssue } from '../../testing/makeIssue';
import { mockLayout } from '../../testing/mockLayout';
import { seedWorkspace } from '../../testing/seedWorkspace';
import { DataGrid } from './DataGrid';
import { ROW_NUMBER_WIDTH } from './gridLayout';
import { MIN_COLUMN_WIDTH, toColumnWidths } from './toColumnWidths';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../../testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout();

const trim = toIssueId('whitespace:1');
const duplicates = toIssueId('exact-duplicates');

describe('DataGrid', () => {
  beforeEach(() => {
    seedWorkspace(
      'id,name,amount',
      '1, Ada ,10.5',
      '2,Bo,20.5',
      '3,Cy,30.5',
      '4,Di,40.5',
      '4,Di,40.5',
      '5,Ed,50.5',
      '6,Flo,60.5'
    );
  });

  it('shows the header and every row, numbered like a spreadsheet', () => {
    render(<DataGrid />);

    expect(
      screen.getByRole('columnheader', { name: 'name' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'amount' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('rowheader').map((header) => header.textContent)
    ).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    expect(screen.getByText('Flo')).toBeInTheDocument();
  });

  it('numbers the columns for assistive technology, the row numbers being the first column', () => {
    render(<DataGrid />);

    expect(screen.getByRole('table')).toHaveAttribute('aria-colcount', '4');
    expect(screen.getByRole('columnheader', { name: 'Row' })).toHaveAttribute(
      'aria-colindex',
      '1'
    );
    expect(screen.getByRole('columnheader', { name: 'id' })).toHaveAttribute(
      'aria-colindex',
      '2'
    );
    expect(
      screen.getByRole('columnheader', { name: 'amount' })
    ).toHaveAttribute('aria-colindex', '4');
    expect(
      rowNumbered('2').querySelector('[role="rowheader"]')
    ).toHaveAttribute('aria-colindex', '1');
    expect(cellContaining('Bo')).toHaveAttribute('aria-colindex', '3');
    expect(screen.getAllByRole('row')[0]).toHaveAttribute('aria-rowindex', '1');
  });

  it('names a column whose header is empty by its number', () => {
    seedWorkspace('id,', '1,x', '2,y');

    render(<DataGrid />);

    expect(
      screen.getByRole('columnheader', { name: 'Column 2' })
    ).toBeInTheDocument();
  });

  it('makes padding visible in a cell', () => {
    render(<DataGrid />);

    expect(screen.getAllByRole('img', { name: 'space' })).toHaveLength(2);
  });

  it('shows a skeleton for rows whose chunk has not arrived, and no cells', () => {
    workspaceStore$.setState(({ phase }) =>
      phase.status === 'ready'
        ? { phase: { ...phase, facts: { ...phase.facts, rowCount: 20 } } }
        : { phase }
    );

    render(<DataGrid />);

    expect(screen.getAllByRole('rowheader')).toHaveLength(7);
    expect(
      screen.getByRole('table').querySelectorAll('.animate-pulse').length
    ).toBeGreaterThan(0);
  });

  it('sizes the columns from the first rows when they arrive after the grid first rendered', () => {
    const dataset = seedWorkspace(
      'id,notes',
      `1,${'long note '.repeat(12)}`,
      `2,${'longer note '.repeat(12)}`
    );
    const { phase } = workspaceStore$.getState();
    workspaceStore$.setState(
      phase.status === 'ready'
        ? { phase: { ...phase, rowChunks: [] } }
        : { phase }
    );
    render(<DataGrid />);

    act(() => workspaceStore$.setState({ phase }));

    const widths = toColumnWidths({
      columns: dataset.columns,
      rows: dataset.rows,
    });
    const expectedWidth = widths.reduce(
      (total, width) => total + width,
      ROW_NUMBER_WIDTH
    );
    expect(screen.getAllByRole('row')[0]).toHaveStyle({
      width: `${expectedWidth}px`,
    });
    expect(Math.max(...widths)).toBeGreaterThan(MIN_COLUMN_WIDTH);
  });

  describe('decisions', () => {
    it('shows the cleaned value of an accepted cell, marked as changed from the original', () => {
      render(<DataGrid />);
      expect(screen.queryByText(/changed from/)).not.toBeInTheDocument();

      act(() => reviewActions.accept(trim));

      const cell = cellContaining('Ada');
      expect(cell).toHaveTextContent(/Ada, changed from\s+Ada/);
      expect(within(cell).queryByRole('img')).not.toBeInTheDocument();
    });

    it('shows the original value again in the original view and after undo', () => {
      render(<DataGrid />);
      act(() => reviewActions.accept(trim));

      act(() => reviewActions.showView('original'));
      expect(
        within(cellContaining('Ada')).getAllByRole('img', { name: 'space' })
      ).toHaveLength(2);
      expect(screen.queryByText(/changed from/)).not.toBeInTheDocument();

      act(() => {
        reviewActions.showView('cleaned');
        reviewActions.resetDecision(trim);
      });
      expect(
        within(cellContaining('Ada')).getAllByRole('img', { name: 'space' })
      ).toHaveLength(2);
    });

    it('strikes through a removed row in the cleaned view only', () => {
      render(<DataGrid />);

      act(() => reviewActions.accept(duplicates));

      const removed = rowNumbered('6');
      expect(removed).toHaveTextContent('removed');
      expect(cellOfText({ within: removed, text: 'Di' })).toHaveClass(
        'line-through'
      );
      expect(rowNumbered('5')).not.toHaveTextContent('removed');

      act(() => reviewActions.showView('original'));

      expect(rowNumbered('6')).not.toHaveTextContent('removed');
      expect(
        cellOfText({ within: rowNumbered('6'), text: 'Di' })
      ).not.toHaveClass('line-through');
    });
  });

  describe('the selected issue', () => {
    it('highlights its cells, and nothing else', () => {
      render(<DataGrid />);
      act(() => reviewActions.select(trim));

      const highlighted = cellContaining('Ada');
      expect(highlighted).toHaveClass('bg-highlight');
      expect(cellContaining('Bo')).not.toHaveClass('bg-highlight');
      expect(
        within(rowNumbered('2')).getByText('1').closest('[role="cell"]')
      ).not.toHaveClass('bg-highlight');
    });

    it('highlights the whole row for an issue that covers whole rows', () => {
      render(<DataGrid />);

      act(() => reviewActions.select(duplicates));

      for (const cell of within(rowNumbered('5')).getAllByRole('cell')) {
        expect(cell).toHaveClass('bg-highlight');
      }
      expect(rowNumbered('3').querySelector('.bg-highlight')).toBeNull();
    });

    it('lists only the rows of the issue when asked', () => {
      render(<DataGrid />);
      act(() => {
        reviewActions.select(duplicates);
        reviewActions.toggleOnlyIssueRows();
      });

      expect(
        screen.getAllByRole('rowheader').map((header) => header.textContent)
      ).toEqual(['5', '6']);

      act(() => reviewActions.toggleOnlyIssueRows());

      expect(screen.getAllByRole('rowheader')).toHaveLength(7);
    });

    it('lists every row again when the filter is on and the selected issue has no rows', () => {
      const noRows = makeIssue({
        id: 'empty-headers',
        category: 'suspicious',
        rows: [],
        details: { kind: 'emptyHeaders', columns: [toColumnKey(1)] },
      });
      const { phase } = analysisStore$.getState();
      if (phase.status !== 'done') throw new Error('Expected finished checks');
      analysisStore$.setState({
        phase: {
          status: 'done',
          result: {
            ...phase.result,
            issues: [...phase.result.issues, noRows],
          },
        },
      });
      render(<DataGrid />);
      act(() => {
        reviewActions.select(duplicates);
        reviewActions.toggleOnlyIssueRows();
      });
      expect(screen.getAllByRole('rowheader')).toHaveLength(2);

      act(() => reviewActions.select(noRows.id));

      expect(screen.getAllByRole('rowheader')).toHaveLength(7);
    });

    it('marks the row it jumped to', () => {
      render(<DataGrid />);

      act(() => reviewActions.jumpToRow(toRowId(3)));

      expect(rowNumbered('5')).toHaveAttribute('aria-current', 'true');
      expect(rowNumbered('4')).not.toHaveAttribute('aria-current');
    });
  });

  describe('numbers', () => {
    it('aligns a numeric column to the right once the profile has arrived', () => {
      const { phase } = analysisStore$.getState();
      analysisStore$.setState({
        phase: { status: 'running', stage: 'profiling', percentage: 0 },
      });
      render(<DataGrid />);
      const amount = () => cellContaining('10.5');
      expect(amount()).not.toHaveClass('justify-end');

      act(() => analysisStore$.setState({ phase }));

      expect(amount()).toHaveClass('justify-end', 'tabular-nums');
      expect(cellContaining('Bo')).not.toHaveClass('justify-end');
    });
  });

  it('tells the review store how to scroll to a row while it is mounted', () => {
    const { unmount } = render(<DataGrid />);
    expect(reviewStore$.metadata.scrollToRow).toBeTypeOf('function');

    unmount();

    expect(reviewStore$.metadata.scrollToRow).toBeNull();
  });
});

function rowNumbered(number: string): HTMLElement {
  const header = screen.getByRole('rowheader', {
    name: new RegExp(`^${number}`),
  });
  const row = header.closest('[role="row"]');
  if (!(row instanceof HTMLElement)) throw new Error(`No row ${number}`);

  return row;
}

function cellOfText({
  within: container,
  text,
}: {
  within: HTMLElement;
  text: string;
}): HTMLElement {
  const cell = within(container).getByText(text).closest('[role="cell"]');
  if (!(cell instanceof HTMLElement)) throw new Error(`No cell with ${text}`);

  return cell;
}

function cellContaining(text: string): HTMLElement {
  const cells = screen
    .getAllByRole('cell')
    .filter((cell) => cell.textContent?.includes(text));

  return elementAt(cells, 0);
}
