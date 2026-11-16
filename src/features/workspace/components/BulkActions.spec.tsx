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

  it('states how many it will accept and reject before the click, and that number is what gets decided', async () => {
    render(<BulkActions category="inconsistent" />);
    const accept = screen.getByRole('button', {
      name: 'Apply all certain and high · 2',
    });
    expect(
      screen.getByRole('button', { name: 'Keep all as is · 4' })
    ).toBeEnabled();

    await userEvent.click(accept);

    expect(reviewStore$.getState().decisions.size).toBe(2);
    expect(
      screen.getByRole('button', { name: 'Apply all certain and high · 0' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Keep all as is · 2' })
    ).toBeEnabled();
  });

  it('widens the confidence it accepts down to, and the count follows', async () => {
    const user = userEvent.setup();
    render(<BulkActions category="inconsistent" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Down to' }),
      'Low'
    );

    const accept = screen.getByRole('button', {
      name: 'Apply all with a suggestion · 3',
    });
    await user.click(accept);
    expect(reviewStore$.getState().decisions.size).toBe(3);
  });

  it('shows nothing to do for a category without issues', () => {
    render(<BulkActions category="missing" />);

    expect(
      screen.getByRole('button', { name: 'Apply all certain and high · 0' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Keep all as is · 0' })
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
