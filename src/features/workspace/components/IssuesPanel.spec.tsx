import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiFailureCopy } from '../aiFailureCopy';
import { aiStore$ } from '../state/aiStore';
import { settingsActions } from '../state/settingsStore';
import { toRunId } from '../state/runId';
import { analysisStore$ } from '../state/analysisStore';
import { makeIssue } from '../testing/makeIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedIssues } from '../testing/seedIssues';
import { IssuesPanel } from './IssuesPanel';

const { worker } = vi.hoisted(() => ({ worker: { analyze: vi.fn() } }));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

mockLayout();

describe('IssuesPanel', () => {
  beforeEach(() => {
    worker.analyze.mockReset();
    seedIssues({
      lines: ['name', 'Ada'],
      issues: [makeIssue({ id: 'a', details: { kind: 'blankRows' } })],
    });
  });

  it('shows the counts, the progress and the issues once the checks are done', () => {
    render(<IssuesPanel />);

    expect(
      screen.getByRole('group', { name: 'Filter issues by category' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '0 of 1 decided' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: 'Blank rows' })
    ).toBeInTheDocument();
  });

  it('says so when the checks found nothing', () => {
    seedIssues({ lines: ['name', 'Ada'], issues: [] });

    render(<IssuesPanel />);

    expect(
      screen.getByText('The checks found no issues in this file.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Issues' })
    ).not.toBeInTheDocument();
  });

  it('shows the real progress of the checks over placeholders while they run', () => {
    analysisStore$.setState({
      phase: { status: 'running', stage: 'checking', percentage: 46 },
    });

    render(<IssuesPanel />);

    expect(
      screen.getByRole('progressbar', { name: 'Running checks' })
    ).toHaveAttribute('aria-valuenow', '46');
    expect(
      screen.queryByRole('group', { name: 'Filter issues by category' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('says the file has not been checked when the checks fail, and runs them again on Retry', async () => {
    const user = userEvent.setup();
    worker.analyze.mockReturnValue({
      status: 'pending',
      cancel() {},
      onProgress() {
        return this;
      },
      then() {},
    });
    analysisStore$.setState({ phase: { status: 'failed' } });
    render(<IssuesPanel />);

    expect(screen.getByText('The checks could not run')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(worker.analyze).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('progressbar', { name: 'Profiling columns' })
    ).toBeInTheDocument();
  });

  it.each(['rateLimited', 'budgetExhausted', 'aiNotConfigured'] as const)(
    'shows why the AI stopped on %s and keeps the issues of the checks on screen',
    (reason) => {
      aiStore$.setState((state) => ({
        ...state,
        run: {
          runId: toRunId(1),
          model: 'anthropic/claude-haiku-5.5',
          jobs: [
            {
              key: 'confirmDuplicates:0',
              request: {
                task: 'confirmDuplicates',
                request: { pairs: [], columns: [] },
              },
              state: { status: 'failed', reason },
            },
          ],
        },
      }));

      render(<IssuesPanel />);

      expect(
        screen.getByText(aiFailureCopy[reason], { exact: false })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('article', { name: 'Blank rows' })
      ).toBeInTheDocument();
    }
  );

  it('offers the own key on a spent budget, but not to a visitor already using one', () => {
    const showBudgetFailure = () =>
      aiStore$.setState((state) => ({
        ...state,
        run: {
          runId: toRunId(1),
          model: 'anthropic/claude-haiku-5.5',
          jobs: [
            {
              key: 'confirmDuplicates:0',
              request: {
                task: 'confirmDuplicates',
                request: { pairs: [], columns: [] },
              },
              state: { status: 'failed', reason: 'budgetExhausted' },
            },
          ],
        },
      }));
    showBudgetFailure();
    const { unmount } = render(<IssuesPanel />);
    expect(screen.getByText(/use your own OpenRouter key/)).toBeInTheDocument();
    unmount();

    settingsActions.saveOwnKey('sk-or-visitor');
    render(<IssuesPanel />);

    expect(screen.getByText(/budget is used up/)).toBeInTheDocument();
    expect(
      screen.queryByText(/use your own OpenRouter key/)
    ).not.toBeInTheDocument();
    settingsActions.removeOwnKey();
  });
});
