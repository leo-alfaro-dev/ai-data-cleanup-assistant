import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { previewStore$ } from '../state/previewStore';
import type { PreviewEntry } from '../state/previewEntry';
import { elementAt } from '../testing/elementAt';
import { makeIssue } from '../testing/makeIssue';
import { seedWorkspace } from '../testing/seedWorkspace';
import { IssueExamples } from './IssueExamples';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const issue = makeIssue({
  id: 'whitespace:0',
  rows: [0, 1],
  column: toColumnKey(0),
  suggestion: { kind: 'trimWhitespace', column: toColumnKey(0) },
});

describe('IssueExamples', () => {
  beforeEach(() => {
    seedWorkspace('name', 'Ada', 'Bo');
  });

  it('shows each before and after pair with the spaces made visible', () => {
    showPreview({
      status: 'ready',
      preview: preview({
        counts: { cells: 3, rows: 2, removedRows: 0 },
        examples: [
          { before: ' Ada ', after: 'Ada', cells: 2 },
          { before: 'Bo\u00a0', after: 'Bo', cells: 1 },
        ],
      }),
    });

    render(<IssueExamples issue={issue} />);

    const items = screen.getAllByRole('listitem');
    const first = elementAt(items, 0);
    const second = elementAt(items, 1);
    expect(within(first).getAllByRole('img', { name: 'space' })).toHaveLength(
      2
    );
    expect(first).toHaveTextContent('·Ada·');
    expect(within(first).getByText('× 2')).toBeInTheDocument();
    expect(
      within(second).getByRole('img', { name: 'non-breaking space' })
    ).toBeInTheDocument();
    expect(within(second).queryByText(/×/)).not.toBeInTheDocument();
  });

  it('counts the cells, the rows and the rows removed', () => {
    showPreview({
      status: 'ready',
      preview: preview({
        counts: { cells: 12, rows: 10, removedRows: 3 },
        examples: [],
      }),
    });

    render(<IssueExamples issue={issue} />);

    expect(
      screen.getByText('Changes 12 cells in 10 rows. Removes 3 rows.')
    ).toBeInTheDocument();
  });

  it('shows an empty value as the muted mark', () => {
    showPreview({
      status: 'ready',
      preview: preview({
        counts: { cells: 1, rows: 1, removedRows: 0 },
        examples: [{ before: 'N/A', after: '', cells: 1 }],
      }),
    });

    render(<IssueExamples issue={issue} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('shows placeholders while the preview is built, and no pairs', () => {
    showPreview({ status: 'loading' });

    const { container } = render(<IssueExamples issue={issue} />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/Changes/)).not.toBeInTheDocument();
  });

  it('says so when the preview could not be built', () => {
    showPreview({ status: 'failed' });

    render(<IssueExamples issue={issue} />);

    expect(
      screen.getByText('The preview could not be built.')
    ).toBeInTheDocument();
  });
});

function showPreview(entry: PreviewEntry): void {
  previewStore$.setState((state) => ({
    ...state,
    previews: new Map([[issue.id, entry]]),
  }));
}

function preview(value: ChangePreview): ChangePreview {
  return value;
}
