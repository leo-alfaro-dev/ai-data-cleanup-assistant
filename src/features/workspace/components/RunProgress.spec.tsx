import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiFailureCopy } from '../aiFailureCopy';
import type { AiJob, AiJobState } from '../state/aiJob';
import { aiActions, aiStore$ } from '../state/aiStore';
import { toRunId } from '../state/runId';
import { RunProgress } from './RunProgress';

function showRun(...states: AiJobState[]): void {
  const jobs: AiJob[] = states.map((state, index) => ({
    key: `normalizeValues:${index}`,
    request: {
      task: 'normalizeValues',
      request: {
        column: { key: index, header: `c${index}`, dominantType: 'text' },
        values: [],
        isComplete: true,
      },
    },
    state,
  }));
  aiStore$.setState((state) => ({
    ...state,
    run: { runId: toRunId(1), model: 'anthropic/claude-haiku-5.5', jobs },
  }));
}

describe('RunProgress', () => {
  beforeEach(() => {
    aiActions.reset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows beside the title how many hosted-key requests this window holds', () => {
    showRun({ status: 'done' });
    aiStore$.setState((state) => ({
      ...state,
      quota: { used: 12, limit: 50, resetsAt: Date.UTC(2026, 10, 16, 10, 42) },
    }));

    render(<RunProgress />);

    expect(
      screen.getByRole('heading', { name: 'AI tasks' }).parentElement
    ).toHaveTextContent(/^AI tasks· 12 of 50 requests, resets at \S+/);
  });

  it('shows no count before the server reported one', () => {
    showRun({ status: 'done' });

    render(<RunProgress />);

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByText(/requests, resets at/)).not.toBeInTheDocument();
  });

  it('shows a task as queued before any of its requests starts', () => {
    showRun({ status: 'queued' }, { status: 'queued' });

    render(<RunProgress />);

    const row = screen.getByRole('listitem');
    expect(
      within(row).getByText('Group spellings of one value')
    ).toBeInTheDocument();
    expect(within(row).getByText('Queued')).toBeInTheDocument();
  });

  it('shows how many requests of a running task are done', () => {
    showRun({ status: 'done' }, { status: 'running' }, { status: 'queued' });

    render(<RunProgress />);

    expect(screen.getByText('Running, 1 of 3 done')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument();
  });

  it('shows a task as done with no retry', () => {
    showRun({ status: 'done' }, { status: 'done' });

    render(<RunProgress />);

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument();
  });

  it('shows the reason a task failed in words, how many requests failed, and a retry', () => {
    showRun({ status: 'done' }, { status: 'failed', reason: 'rateLimited' });

    render(<RunProgress />);

    expect(screen.getByText('1 of 2 failed')).toBeInTheDocument();
    expect(
      screen.getByText(aiFailureCopy.rateLimited, { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('disables Retry while another request of the run is still going', () => {
    showRun({ status: 'failed', reason: 'timeout' });
    aiStore$.setState((state) => ({
      ...state,
      run: state.run && {
        ...state.run,
        jobs: [
          ...state.run.jobs,
          {
            key: 'confirmDuplicates:0',
            request: {
              task: 'confirmDuplicates',
              request: { columns: ['name'], pairs: [] },
            },
            state: { status: 'running' },
          },
        ],
      },
    }));

    render(<RunProgress />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });

  it('says Failed when every request failed', () => {
    showRun({ status: 'failed', reason: 'aiNotConfigured' });

    render(<RunProgress />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(aiFailureCopy.aiNotConfigured)).toBeInTheDocument();
  });

  it('retries the task when Retry is pressed', async () => {
    const user = userEvent.setup();
    const retry = vi.spyOn(aiActions, 'retryTask').mockResolvedValue(undefined);
    showRun({ status: 'failed', reason: 'timeout' });
    render(<RunProgress />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(retry).toHaveBeenCalledWith('normalizeValues');
  });

  it('gives every failure reason words of its own', () => {
    const texts = Object.values(aiFailureCopy);

    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.every((text) => text.endsWith('.'))).toBe(true);
  });
});
