import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { reviewActions, reviewStore$ } from '../../state/reviewStore';
import { makeIssue } from '../../testing/makeIssue';
import { seedIssues } from '../../testing/seedIssues';
import { GridToolbar } from './GridToolbar';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../../testing/idleWorkerModule');

  return idleWorkerModule;
});

const withRows = makeIssue({
  id: 'invalid-emails:1',
  category: 'suspicious',
  rows: [1],
  column: toColumnKey(1),
  details: { kind: 'invalidEmails' },
});
const withoutRows = makeIssue({
  id: 'empty-headers',
  category: 'suspicious',
  rows: [],
  details: { kind: 'emptyHeaders', columns: [toColumnKey(1)] },
});

describe('GridToolbar', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name,email', 'Ada,a@example.com', 'Bo,bo'],
      issues: [withRows, withoutRows],
    });
  });

  it('shows the cleaned values first and switches to the original and back', async () => {
    const user = userEvent.setup();
    render(<GridToolbar />);
    expect(screen.getByRole('radio', { name: 'Cleaned' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Original' }));

    expect(reviewStore$.getState().view).toBe('original');
    expect(screen.getByRole('radio', { name: 'Original' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Cleaned' }));

    expect(reviewStore$.getState().view).toBe('cleaned');
  });

  it('keeps the chosen view when the chosen option is pressed again', async () => {
    const user = userEvent.setup();
    render(<GridToolbar />);

    await user.click(screen.getByRole('radio', { name: 'Cleaned' }));

    expect(reviewStore$.getState().view).toBe('cleaned');
  });

  it('offers nothing about an issue while none is selected', () => {
    render(<GridToolbar />);

    expect(
      screen.queryByRole('button', { name: 'Only rows in this issue' })
    ).not.toBeInTheDocument();
  });

  it('names the category of the selected issue and offers to list only its rows', async () => {
    const user = userEvent.setup();
    render(<GridToolbar />);
    act(() => reviewActions.select(withRows.id));

    expect(screen.getByText('Suspicious records')).toBeInTheDocument();
    const filter = screen.getByRole('button', {
      name: 'Only rows in this issue',
    });
    expect(filter).toHaveAttribute('aria-pressed', 'false');

    await user.click(filter);

    expect(reviewStore$.getState().isOnlyIssueRows).toBe(true);
    expect(filter).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers no row filter for an issue that has no rows', () => {
    render(<GridToolbar />);

    act(() => reviewActions.select(withoutRows.id));

    expect(screen.getByText('Suspicious records')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Only rows in this issue' })
    ).not.toBeInTheDocument();
  });
});
