import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiJob, AiJobState } from '../state/aiJob';
import { aiActions, aiStore$ } from '../state/aiStore';
import * as rerun from '../state/rerunAiTasks';
import { toRunId } from '../state/runId';
import { settingsActions, settingsStore$ } from '../state/settingsStore';
import { AiToolbar } from './AiToolbar';

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

describe('AiToolbar', () => {
  beforeEach(() => {
    aiActions.reset();
    settingsActions.selectModel('anthropic/claude-haiku-5.5');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers the models that can be chosen, with the current one selected', () => {
    render(<AiToolbar />);

    const picker = screen.getByRole('combobox', { name: 'Model' });
    expect(picker).toHaveValue('anthropic/claude-haiku-5.5');
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['Claude Haiku 5.5', 'Gemini 2.5 Flash Lite']);
  });

  it('stores the model that is picked', async () => {
    const user = userEvent.setup();
    render(<AiToolbar />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Model' }),
      'Gemini 2.5 Flash Lite'
    );

    expect(settingsStore$.getState().modelId).toBe(
      'google/gemini-2.5-flash-lite'
    );
  });

  it('is enabled when no run is in flight, also after a run that finished or failed', () => {
    showRun({ status: 'done' }, { status: 'failed', reason: 'timeout' });

    render(<AiToolbar />);

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Run again' })).toBeEnabled();
  });

  it.each<[string, AiJobState[]]>([
    ['a request is queued', [{ status: 'done' }, { status: 'queued' }]],
    ['a request is running', [{ status: 'running' }]],
  ])('disables the model picker and Run again while %s', (_name, states) => {
    showRun(...states);

    render(<AiToolbar />);

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run again' })).toBeDisabled();
  });

  it('disables them from the moment a run starts, before it knows its requests', () => {
    aiStore$.setState((state) => ({ ...state, isPreparing: true }));

    render(<AiToolbar />);

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run again' })).toBeDisabled();
  });

  it('enables them again once the last request settles', () => {
    showRun({ status: 'running' });
    render(<AiToolbar />);
    expect(screen.getByRole('button', { name: 'Run again' })).toBeDisabled();

    act(() => showRun({ status: 'done' }));

    expect(screen.getByRole('button', { name: 'Run again' })).toBeEnabled();
  });

  it('runs the AI tasks again when Run again is pressed', async () => {
    const user = userEvent.setup();
    const rerunSpy = vi
      .spyOn(rerun, 'rerunAiTasks')
      .mockResolvedValue(undefined);
    render(<AiToolbar />);

    await user.click(screen.getByRole('button', { name: 'Run again' }));

    expect(rerunSpy).toHaveBeenCalledOnce();
  });
});
