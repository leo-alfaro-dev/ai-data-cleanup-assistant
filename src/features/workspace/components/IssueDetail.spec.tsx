import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { previewStore$ } from '../state/previewStore';
import { reviewActions, reviewStore$ } from '../state/reviewStore';
import { makeIssue } from '../testing/makeIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedIssues } from '../testing/seedIssues';
import { IssueDetail } from './IssueDetail';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout({ height: 300 });

const lines = [
  'name,email',
  ' Ada ,a@example.com',
  'Bo,bo',
  'Bo,bo',
  'Cy,cy@example.com',
];
const trim = makeIssue({
  id: 'whitespace:0',
  rows: [0],
  column: toColumnKey(0),
  suggestion: { kind: 'trimWhitespace', column: toColumnKey(0) },
  details: {
    kind: 'whitespace',
    paddedCount: 1,
    innerCount: 0,
    nonBreakingCount: 0,
  },
});
const duplicates = makeIssue({
  id: 'exact-duplicates',
  category: 'duplicate',
  rows: [1, 2],
  suggestion: {
    kind: 'dropDuplicateRows',
    mode: 'exact',
    groups: [[toRowId(1), toRowId(2)]],
  },
  details: { kind: 'exactDuplicates', groups: [[toRowId(1), toRowId(2)]] },
});
const emails = makeIssue({
  id: 'invalid-emails:1',
  category: 'suspicious',
  rows: [1, 2],
  column: toColumnKey(1),
  details: { kind: 'invalidEmails' },
});

describe('IssueDetail', () => {
  beforeEach(() => {
    seedIssues({ lines, issues: [trim, duplicates, emails] });
  });

  it('says what the issue is, what changes and by how much, with the pairs', () => {
    const preview: ChangePreview = {
      counts: { cells: 1, rows: 1, removedRows: 0 },
      examples: [{ before: ' Ada ', after: 'Ada', cells: 1 }],
    };
    previewStore$.setState((state) => ({
      ...state,
      previews: new Map([[trim.id, { status: 'ready', preview }]]),
    }));

    render(<IssueDetail issue={trim} />);

    expect(
      screen.getByRole('heading', { name: 'Extra spaces in “name”' })
    ).toBeInTheDocument();
    expect(screen.getByText('Check · High')).toBeInTheDocument();
    expect(screen.getByText('1 padded.')).toBeInTheDocument();
    expect(
      screen.getByText('Remove extra spaces from the values in “name”.')
    ).toBeInTheDocument();
    expect(screen.getByText('Changes 1 cell in 1 row.')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Before and after' })
    ).toBeInTheDocument();
  });

  it('puts the rows of a duplicate group side by side', () => {
    render(<IssueDetail issue={duplicates} />);

    expect(
      screen.getByRole('table', { name: /Rows 3, 4/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Remove 1 row and keep the first row of each group.')
    ).toBeInTheDocument();
  });

  it('shows no group table for an issue that is not about duplicates', () => {
    render(<IssueDetail issue={trim} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says no change is suggested, and shows no before and after, when there is no suggestion', () => {
    render(<IssueDetail issue={emails} />);

    expect(screen.getByText(/No change is suggested/)).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Before and after' })
    ).not.toBeInTheDocument();
  });

  it('lists the affected rows', () => {
    render(<IssueDetail issue={emails} />);

    expect(screen.getByText('Affected 2 rows')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show row 3 in the grid' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show row 4 in the grid' })
    ).toBeInTheDocument();
  });

  it('shows no empty list of affected rows for an issue about columns', () => {
    const headers = makeIssue({
      id: 'empty-headers',
      category: 'suspicious',
      rows: [],
      details: { kind: 'emptyHeaders', columns: [toColumnKey(1)] },
    });

    render(<IssueDetail issue={headers} />);

    expect(
      screen.getByRole('heading', { name: 'Empty column headers' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Affected/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Affected rows' })
    ).not.toBeInTheDocument();
  });

  it('says how many groups it shows when there are more than three', () => {
    const groups = Array.from({ length: 5 }, (_, index) => [
      toRowId(index),
      toRowId(index + 10),
    ]);
    const many = makeIssue({
      id: 'exact-duplicates',
      category: 'duplicate',
      rows: groups.flat(),
      details: { kind: 'exactDuplicates', groups },
    });

    render(<IssueDetail issue={many} />);

    expect(screen.getAllByRole('table')).toHaveLength(3);
    expect(screen.getByText(/Showing 3 of 5 groups/)).toBeInTheDocument();
  });

  it('closes by clearing the selection', async () => {
    const user = userEvent.setup();
    reviewActions.select(trim.id);
    render(<IssueDetail issue={trim} />);

    await user.click(
      screen.getByRole('button', { name: 'Close issue detail' })
    );

    expect(reviewStore$.getState().selectedIssueId).toBeNull();
  });
});
