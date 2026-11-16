import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { makeIssue } from '../testing/makeIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedIssues } from '../testing/seedIssues';
import { CategorySummary } from './CategorySummary';
import { IssueList } from './IssueList';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout();

describe('CategorySummary', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name,city', 'Ada,Paris', 'Bo,Rome'],
      issues: [
        makeIssue({
          id: 'a',
          category: 'duplicate',
          rows: [0, 1],
          details: { kind: 'exactDuplicates', groups: [] },
        }),
        makeIssue({
          id: 'b',
          category: 'duplicate',
          details: { kind: 'normalizedDuplicates', groups: [] },
        }),
        makeIssue({
          id: 'c',
          category: 'inconsistent',
          details: { kind: 'skippedBlankLines', count: 1 },
        }),
        makeIssue({
          id: 'd',
          category: 'suspicious',
          column: toColumnKey(1),
          details: { kind: 'invalidEmails' },
        }),
        makeIssue({
          id: 'e',
          category: 'suspicious',
          details: { kind: 'blankRows' },
        }),
        makeIssue({
          id: 'f',
          category: 'suspicious',
          details: {
            kind: 'raggedRows',
            headerCellCount: 2,
            shortRowCount: 1,
            longRowCount: 0,
          },
        }),
      ],
    });
  });

  it('counts the issues of each category, with the names the brief uses', () => {
    render(<CategorySummary />);

    expect(screen.getByRole('button', { name: 'Duplicates 2' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Inconsistent values 1' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Suspicious records 3' })
    ).toBeEnabled();
  });

  it('disables a category with no issues', () => {
    render(<CategorySummary />);

    expect(
      screen.getByRole('button', { name: 'Missing data 0' })
    ).toBeDisabled();
  });

  it('shows every issue at first, under a pressed All with the total', () => {
    render(<CategorySummary />);

    expect(screen.getByRole('button', { name: 'All 6' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByRole('button', { name: 'Duplicates 2' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('narrows the list to a category and brings the whole list back with All', async () => {
    const user = userEvent.setup();
    render(
      <>
        <CategorySummary />
        <IssueList />
      </>
    );
    const list = screen.getByRole('list', { name: 'Issues' });
    expect(within(list).getAllByRole('article')).toHaveLength(6);
    expect(within(list).getByText('Exact duplicate rows')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Suspicious records 3' })
    );

    expect(within(list).getAllByRole('article')).toHaveLength(3);
    expect(
      within(list).queryByText('Exact duplicate rows')
    ).not.toBeInTheDocument();
    expect(within(list).getByText('Blank rows')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Suspicious records 3' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All 6' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await user.click(screen.getByRole('button', { name: 'All 6' }));

    expect(within(list).getAllByRole('article')).toHaveLength(6);
    expect(
      screen.getByRole('button', { name: 'Suspicious records 3' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('lists the issues by category, then by rows affected', () => {
    render(<IssueList />);

    const titles = screen
      .getAllByRole('article')
      .map(
        (article) =>
          document.getElementById(article.getAttribute('aria-labelledby') ?? '')
            ?.textContent
      );

    expect(titles).toEqual([
      'Exact duplicate rows',
      'Duplicate rows that differ in spacing or case',
      'Blank lines in the file',
      'Invalid email addresses in “city”',
      'Blank rows',
      'Rows with the wrong number of cells',
    ]);
  });
});
