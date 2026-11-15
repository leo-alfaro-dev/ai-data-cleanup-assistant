import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiStore$ } from '../state/aiStore';
import { analysisStore$ } from '../state/analysisStore';
import { makeIssue } from '../testing/makeIssue';
import { seedIssues } from '../testing/seedIssues';
import { AnalysisAnnouncement } from './AnalysisAnnouncement';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

describe('AnalysisAnnouncement', () => {
  beforeEach(() => {
    seedIssues({ lines: ['name', 'Ada'], issues: [makeIssue({ id: 'a' })] });
  });

  it('is a polite live region that stays in the page', () => {
    const { container } = render(<AnalysisAnnouncement />);

    expect(container.querySelector('p[aria-live="polite"]')).not.toBeNull();
  });

  it('says the stage while the checks run and the result when they finish', () => {
    analysisStore$.setState({
      phase: { status: 'running', stage: 'checking', percentage: 46 },
    });
    const { container } = render(<AnalysisAnnouncement />);
    expect(container).toHaveTextContent('Running checks');

    act(() =>
      analysisStore$.setState({
        phase: {
          status: 'done',
          result: {
            profile: [],
            candidates: [],
            issues: [makeIssue({ id: 'a' }), makeIssue({ id: 'b' })],
          },
        },
      })
    );

    expect(container).toHaveTextContent('Checks finished. 2 issues found.');
  });

  it('counts the issues the checks found, and says nothing new when AI issues land', () => {
    const checkIssue = makeIssue({ id: 'a' });
    analysisStore$.setState({
      phase: {
        status: 'done',
        result: { profile: [], candidates: [], issues: [checkIssue] },
      },
    });
    const { container } = render(<AnalysisAnnouncement />);
    expect(container).toHaveTextContent('Checks finished. 1 issue found.');

    act(() =>
      aiStore$.setState((state) => ({
        ...state,
        issues: [makeIssue({ id: 'b' }), makeIssue({ id: 'c' })],
      }))
    );

    expect(container).toHaveTextContent('Checks finished. 1 issue found.');
  });

  it('says when the checks could not run', () => {
    analysisStore$.setState({ phase: { status: 'failed' } });

    const { container } = render(<AnalysisAnnouncement />);

    expect(container).toHaveTextContent('The checks could not run.');
  });

  it('says nothing before the checks start', () => {
    analysisStore$.setState({ phase: { status: 'idle' } });

    const { container } = render(<AnalysisAnnouncement />);

    expect(container.querySelector('p')?.textContent).toBe('');
  });
});
