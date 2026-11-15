import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AiCallRecord } from '@/ai/aiCallRecord';
import { aiFailureCopy } from '../aiFailureCopy';
import type { AiCallEntry } from '../state/aiCallEntry';
import { aiActions, aiStore$ } from '../state/aiStore';
import { toRunId } from '../state/runId';
import {
  transparencyActions,
  transparencyStore$,
} from '../state/transparencyStore';
import { AiCallSummary } from './AiCallSummary';
import { TransparencyPanel } from './TransparencyPanel';

function record(partial: Partial<AiCallRecord>): AiCallRecord {
  return {
    task: 'normalizeValues',
    model: 'anthropic/claude-haiku-5.5',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 1000,
    cost: 0.001,
    latencyMs: 900,
    outcome: 'valid',
    ...partial,
  };
}

function entry(partial: Partial<AiCallEntry>): AiCallEntry {
  return {
    key: `k${Math.random()}`,
    runId: toRunId(1),
    task: 'normalizeValues',
    model: 'anthropic/claude-haiku-5.5',
    requestBody:
      '{"model":"anthropic/claude-haiku-5.5","request":{"values":[]}}',
    outcome: 'ok',
    records: [record({})],
    claimCount: 10,
    droppedClaims: 0,
    ...partial,
  };
}

function showCalls(...entries: AiCallEntry[]): void {
  aiStore$.setState((state) => ({ ...state, calls: entries }));
}

describe('TransparencyPanel', () => {
  beforeEach(() => {
    aiActions.reset();
    transparencyActions.close();
  });

  it('shows nothing until it is opened', () => {
    showCalls(entry({}));

    render(<TransparencyPanel />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says nothing has been sent when there are no calls', () => {
    transparencyActions.open();

    render(<TransparencyPanel />);

    expect(screen.getByText('Nothing has been sent yet.')).toBeInTheDocument();
  });

  it('adds up the calls, tokens, cost and dropped claims of every request', () => {
    showCalls(
      entry({
        records: [
          record({ totalTokens: 1500, cost: 0.0015 }),
          record({ totalTokens: 500, cost: 0.0005 }),
        ],
        claimCount: 14,
        droppedClaims: 2,
      }),
      entry({
        task: 'confirmDuplicates',
        records: [record({ totalTokens: 2000, cost: 0.002 })],
        claimCount: 6,
        droppedClaims: 1,
      })
    );
    transparencyActions.open();

    render(<TransparencyPanel />);

    const totals = within(screen.getByRole('dialog'));
    expect(totals.getByText('3 calls')).toBeInTheDocument();
    expect(totals.getByText('4.0k')).toBeInTheDocument();
    expect(totals.getByText('$0.004')).toBeInTheDocument();
    expect(totals.getByText('3 of 20')).toBeInTheDocument();
  });

  it('shows a failed request with its reason in words, and no claims', () => {
    showCalls(
      entry({
        outcome: 'rateLimited',
        records: [],
        claimCount: null,
        droppedClaims: null,
      })
    );
    transparencyActions.open();

    render(<TransparencyPanel />);

    expect(
      screen.getByText(new RegExp(aiFailureCopy.rateLimited))
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/claims? made|were left out/)
    ).not.toBeInTheDocument();
  });

  it('labels each request by its task and its model', () => {
    showCalls(
      entry({}),
      entry({ task: 'assessSuspiciousRows', model: 'some/other-model' })
    );
    transparencyActions.open();

    render(<TransparencyPanel />);

    expect(
      screen.getByText('Group spellings of one value')
    ).toBeInTheDocument();
    expect(screen.getByText('Review suspicious rows')).toBeInTheDocument();
    expect(screen.getByText(/Claude Haiku 5.5 · Answered/)).toBeInTheDocument();
    expect(
      screen.getByText(/some\/other-model · Answered/)
    ).toBeInTheDocument();
  });

  it('opens a request to show its body exactly as it was sent', async () => {
    const user = userEvent.setup();
    const body =
      '{"model":"anthropic/claude-haiku-5.5","request":{"values":[{"value":"CA ","count":2}]}}';
    showCalls(entry({ requestBody: body }));
    transparencyActions.open();
    render(<TransparencyPanel />);

    await user.click(
      screen.getByRole('button', { name: /Group spellings of one value/ })
    );

    expect(screen.getByText('Request, exactly as sent')).toBeInTheDocument();
    const shown = document.querySelector('pre');
    expect(shown?.textContent).toBe(body);
  });

  it('says how many claims were left out, and why', async () => {
    const user = userEvent.setup();
    showCalls(entry({ claimCount: 14, droppedClaims: 2 }));
    transparencyActions.open();
    render(<TransparencyPanel />);

    await user.click(
      screen.getByRole('button', { name: /Group spellings of one value/ })
    );

    expect(
      screen.getByText(
        '2 of 14 claims were left out: they cited rows or values that were not sent, or failed validation.'
      )
    ).toBeInTheDocument();
  });

  it('says no claim was left out when none was', async () => {
    const user = userEvent.setup();
    showCalls(entry({ claimCount: 4, droppedClaims: 0 }));
    transparencyActions.open();
    render(<TransparencyPanel />);

    await user.click(
      screen.getByRole('button', { name: /Group spellings of one value/ })
    );

    expect(
      screen.getByText('4 claims made, none left out.')
    ).toBeInTheDocument();
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    showCalls(entry({}));
    transparencyActions.open();
    render(<TransparencyPanel />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(transparencyStore$.getState().isOpen).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AiCallSummary', () => {
  beforeEach(() => {
    aiActions.reset();
    transparencyActions.close();
  });

  it('sums the calls, tokens and cost in one line', () => {
    showCalls(
      entry({
        records: [
          record({ totalTokens: 1500, cost: 0.0015 }),
          record({ totalTokens: 1000, cost: 0.001 }),
        ],
      }),
      entry({ records: [record({ totalTokens: 1600, cost: 0.0016 })] })
    );

    render(<AiCallSummary />);

    expect(
      screen.getByRole('button', { name: '3 AI calls · 4.1k tokens · $0.004' })
    ).toBeInTheDocument();
  });

  it('opens the panel when pressed', async () => {
    const user = userEvent.setup();
    showCalls(entry({}));
    render(<AiCallSummary />);

    await user.click(screen.getByRole('button'));

    expect(transparencyStore$.getState().isOpen).toBe(true);
  });

  it('says 1 AI call in the singular', () => {
    showCalls(entry({}));

    render(<AiCallSummary />);

    expect(screen.getByRole('button')).toHaveTextContent(
      '1 AI call · 1.0k tokens · $0.001'
    );
  });
});
