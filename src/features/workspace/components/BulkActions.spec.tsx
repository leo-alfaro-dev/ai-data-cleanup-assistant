import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { reviewActions, reviewStore$ } from '../state/reviewStore';
import { makeIssue } from '../testing/makeIssue';
import { seedIssues } from '../testing/seedIssues';
import { BulkActions } from './BulkActions';
import { HistoryButtons } from './HistoryButtons';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(0) };

describe('BulkActions', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name', 'Ada'],
      issues: [
        makeIssue({ id: 'a', confidence: 'certain', suggestion: trim }),
        makeIssue({ id: 'b', confidence: 'high', suggestion: trim }),
        makeIssue({ id: 'c', confidence: 'low', suggestion: trim }),
        makeIssue({ id: 'd' }),
      ],
    });
  });

  it('lists how many each choice applies, leaving out a level that adds none', async () => {
    const user = userEvent.setup();
    render(<BulkActions category="inconsistent" />);

    await user.click(screen.getByRole('button', { name: 'Apply suggestions' }));

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent)
    ).toEqual([
      'Only the certain ones 1',
      'Certain and very sure 2',
      'All of them 3',
    ]);
  });

  it('applies the choice, and the number it showed is what gets decided', async () => {
    const user = userEvent.setup();
    render(<BulkActions category="inconsistent" />);
    expect(
      screen.getByRole('button', { name: 'Keep all 4 as is' })
    ).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Apply suggestions' }));
    await user.click(
      screen.getByRole('menuitem', { name: 'Certain and very sure 2' })
    );

    expect(reviewStore$.getState().decisions.size).toBe(2);
    expect(
      screen.getByRole('button', { name: 'Keep all 2 as is' })
    ).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Apply suggestions' }));
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent)
    ).toEqual(['All of them 1']);
  });

  it('keeps every pending issue as is, with or without a suggestion', async () => {
    const user = userEvent.setup();
    render(<BulkActions category="inconsistent" />);

    await user.click(screen.getByRole('button', { name: 'Keep all 4 as is' }));

    expect(reviewStore$.getState().decisions.size).toBe(4);
    expect(
      screen.getByRole('button', { name: 'Apply suggestions' })
    ).toBeDisabled();
  });

  it('shows nothing to do for a category without issues', () => {
    render(<BulkActions category="missing" />);

    expect(
      screen.getByRole('button', { name: 'Apply suggestions' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Keep all 0 as is' })
    ).toBeDisabled();
  });
});

describe('HistoryButtons', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name', 'Ada'],
      issues: [makeIssue({ id: 'a', suggestion: trim })],
    });
  });

  it('enables Undo after a decision and Redo after an undo', async () => {
    const user = userEvent.setup();
    render(<HistoryButtons />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

    reviewActions.acceptAll({ category: 'inconsistent' });
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(reviewStore$.getState().decisions.size).toBe(0);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });
});
