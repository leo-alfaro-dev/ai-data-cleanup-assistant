import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { aiStore$ } from '../state/aiStore';
import { reviewStore$ } from '../state/reviewStore';
import { makeIssue } from '../testing/makeIssue';
import { seedIssues } from '../testing/seedIssues';
import { IssueCard } from './IssueCard';
import { ReviewProgress } from './ReviewProgress';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const fixable = makeIssue({
  id: 'whitespace:0',
  rows: [0, 1],
  column: toColumnKey(0),
  suggestion: { kind: 'trimWhitespace', column: toColumnKey(0) },
  details: {
    kind: 'whitespace',
    paddedCount: 2,
    innerCount: 0,
    nonBreakingCount: 0,
  },
});
const unfixable = makeIssue({
  id: 'invalid-emails:1',
  category: 'suspicious',
  rows: [1],
  column: toColumnKey(1),
  details: { kind: 'invalidEmails' },
});

describe('IssueCard', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name,email', ' Ada ,a@example.com', 'Bo ,bo'],
      issues: [fixable, unfixable],
    });
  });

  it('shows the category, who found it, how sure, and how many rows it touches', () => {
    render(<IssueCard issue={fixable} />);

    expect(
      screen.getByRole('article', { name: 'Extra spaces in “name”' })
    ).toBeInTheDocument();
    expect(screen.getByText('Inconsistent values')).toBeInTheDocument();
    expect(screen.getByText('Check · High')).toBeInTheDocument();
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('shows no row count for an issue that has no rows', () => {
    const headers = makeIssue({
      id: 'empty-headers',
      category: 'suspicious',
      rows: [],
      details: { kind: 'emptyHeaders', columns: [toColumnKey(1)] },
    });

    render(<IssueCard issue={headers} />);

    expect(
      screen.getByRole('article', { name: 'Empty column headers' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/rows?$/)).not.toBeInTheDocument();
  });

  it('says what the AI made of the reviewed rows of a check issue, and nothing before it reviewed any', () => {
    const { rerender } = render(<IssueCard issue={unfixable} />);
    expect(screen.queryByText(/AI found|AI:/)).not.toBeInTheDocument();

    aiStore$.setState((state) => ({
      ...state,
      notes: [
        {
          issueId: unfixable.id,
          rowId: toRowId(1),
          isSuspicious: false,
          column: null,
          reason: 'Plausible.',
          confidence: 'high',
          suggestedValue: null,
        },
      ],
    }));
    act(() => rerender(<IssueCard issue={unfixable} />));

    expect(screen.getByText('AI found it plausible')).toBeInTheDocument();
  });

  it('offers Accept and Reject on a pending issue with a suggestion', () => {
    render(<IssueCard issue={fixable} />);

    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Clear decision' })
    ).not.toBeInTheDocument();
  });

  it('shows Accepted and Undo after accepting, and counts it as decided', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ReviewProgress />
        <IssueCard issue={fixable} />
      </>
    );
    expect(
      screen.getByRole('progressbar', { name: '0 of 2 decided' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear decision' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Accept' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '1 of 2 decided' })
    ).toBeInTheDocument();
  });

  it('shows Rejected after rejecting, and the pending buttons again after Undo', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ReviewProgress />
        <IssueCard issue={fixable} />
      </>
    );

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '1 of 2 decided' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear decision' }));

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '0 of 2 decided' })
    ).toBeInTheDocument();
  });

  it('offers only Dismiss on an issue without a suggestion, and stores it as a rejection', async () => {
    const user = userEvent.setup();
    render(<IssueCard issue={unfixable} />);

    expect(
      screen.queryByRole('button', { name: 'Accept' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByText('Dismissed')).toBeInTheDocument();
    expect(reviewStore$.getState().decisions.get(unfixable.id)).toEqual({
      status: 'rejected',
    });
  });

  describe('keyboard focus', () => {
    it('stays on the main button after Accept, which becomes Undo, and after Undo', async () => {
      const user = userEvent.setup();
      render(<IssueCard issue={fixable} />);
      await user.tab();
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Accept' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(
        screen.getByRole('button', { name: 'Clear decision' })
      ).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('button', { name: 'Accept' })).toHaveFocus();
    });

    it('moves from Reject to the main button, which becomes Undo', async () => {
      const user = userEvent.setup();
      render(<IssueCard issue={fixable} />);

      await user.click(screen.getByRole('button', { name: 'Reject' }));

      expect(
        screen.getByRole('button', { name: 'Clear decision' })
      ).toHaveFocus();
    });

    it('stays on the main button after Dismiss, which becomes Undo', async () => {
      const user = userEvent.setup();
      render(<IssueCard issue={unfixable} />);

      await user.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(
        screen.getByRole('button', { name: 'Clear decision' })
      ).toHaveFocus();
    });
  });

  it('selects the issue when its text is chosen, and marks the selected card', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<IssueCard issue={fixable} />);
    const card = screen.getByRole('article');
    expect(card).not.toHaveAttribute('aria-current');

    await user.click(screen.getByText('Extra spaces in “name”'));
    rerender(<IssueCard issue={fixable} />);

    expect(card).toHaveAttribute('aria-current', 'true');
    expect(reviewStore$.getState().selectedIssueId).toBe(fixable.id);
  });
});
