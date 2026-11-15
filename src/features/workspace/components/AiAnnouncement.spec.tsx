import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AiJobState } from '../state/aiJob';
import { aiActions, aiStore$ } from '../state/aiStore';
import { toRunId } from '../state/runId';
import { AiAnnouncement } from './AiAnnouncement';

function showRun(...states: AiJobState[]): void {
  aiStore$.setState((state) => ({
    ...state,
    run: {
      runId: toRunId(1),
      model: 'anthropic/claude-haiku-5.5',
      jobs: states.map((jobState, index) => ({
        key: `normalizeValues:${index}`,
        request: {
          task: 'normalizeValues',
          request: {
            column: { key: index, header: `c${index}`, dominantType: 'text' },
            values: [],
            isComplete: true,
          },
        },
        state: jobState,
      })),
    },
  }));
}

describe('AiAnnouncement', () => {
  beforeEach(() => {
    aiActions.reset();
  });

  it('is a polite live region that stays in the page', () => {
    const { container } = render(<AiAnnouncement />);

    expect(container.querySelector('p[aria-live="polite"]')).not.toBeNull();
  });

  it('announces a task that finishes or fails, and nothing while it runs', () => {
    showRun({ status: 'running' });
    const { container } = render(<AiAnnouncement />);
    const live = () => container.querySelector('p[aria-live="polite"]');
    expect(live()?.textContent).toBe('');

    act(() => showRun({ status: 'done' }));
    expect(live()?.textContent).toBe('Group spellings of one value: done.');

    act(() => showRun({ status: 'failed', reason: 'timeout' }));
    expect(live()?.textContent).toBe('Group spellings of one value: failed.');
  });
});
