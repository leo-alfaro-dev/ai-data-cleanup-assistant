import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { AiNote } from '@/engine/issues/aiNote';
import { toIssueId } from '@/engine/issues/toIssueId';
import { aiActions, aiStore$ } from '../state/aiStore';
import { elementAt } from '../testing/elementAt';
import { makeIssue } from '../testing/makeIssue';
import { seedWorkspace } from '../testing/seedWorkspace';
import { AiReview } from './AiReview';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const issue = makeIssue({ id: 'numeric-outliers:2', category: 'suspicious' });

function note(partial: Partial<AiNote>): AiNote {
  return {
    issueId: issue.id,
    rowId: toRowId(1),
    isSuspicious: true,
    column: toColumnKey(1),
    reason: 'Far above every other amount.',
    confidence: 'high',
    suggestedValue: null,
    ...partial,
  };
}

function showNotes(...notes: AiNote[]): void {
  aiStore$.setState((state) => ({ ...state, notes }));
}

describe('AiReview', () => {
  beforeEach(() => {
    aiActions.reset();
    seedWorkspace('name,amount', 'Ada,12', 'Bo,9999999', 'Cy,14');
  });

  it('lists the reviewed rows with their number, verdict, column, confidence and the reason', () => {
    showNotes(
      note({}),
      note({
        rowId: toRowId(2),
        isSuspicious: false,
        reason: 'A large but plausible order.',
      })
    );

    render(<AiReview issue={issue} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(elementAt(items, 0)).getByText('Row 3')).toBeInTheDocument();
    expect(
      within(elementAt(items, 0)).getByText('Suspicious')
    ).toBeInTheDocument();
    expect(within(elementAt(items, 0)).getByText('amount')).toBeInTheDocument();
    expect(
      within(elementAt(items, 0)).getByText('Very sure')
    ).toBeInTheDocument();
    expect(
      within(elementAt(items, 0)).getByText('Far above every other amount.')
    ).toBeInTheDocument();
    expect(
      within(elementAt(items, 1)).getByText('Plausible')
    ).toBeInTheDocument();
  });

  it('shows only the notes of its own issue', () => {
    showNotes(
      note({}),
      note({ issueId: toIssueId('invalid-emails:1'), reason: 'Another issue.' })
    );

    render(<AiReview issue={issue} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Another issue.')).not.toBeInTheDocument();
  });

  it('shows a suggested value as a suggestion that is not applied, with its spaces visible', () => {
    showNotes(note({ suggestedValue: ' 99.99 ' }));

    render(<AiReview issue={issue} />);

    expect(
      screen.getByText(/Suggested value, not applied/)
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'space' })).toHaveLength(2);
  });

  it('shows no suggested value when the model gave none', () => {
    showNotes(note({}));

    render(<AiReview issue={issue} />);

    expect(screen.queryByText(/Suggested value/)).not.toBeInTheDocument();
  });

  it('names a note that points at no column by the row only', () => {
    showNotes(note({ column: null }));

    render(<AiReview issue={issue} />);

    expect(screen.queryByText('amount')).not.toBeInTheDocument();
  });
});
