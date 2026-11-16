import { describe, expect, it } from 'vitest';
import { AI_CONCURRENCY, runAiTasks } from './runAiTasks';

function held() {
  const releases: (() => void)[] = [];
  const wait = () =>
    new Promise<void>((resolve) => {
      releases.push(resolve);
    });

  return { wait, releases };
}

describe('runAiTasks', () => {
  it('runs every job', async () => {
    const seen: number[] = [];

    await runAiTasks({
      jobs: [1, 2, 3, 4, 5],
      signal: new AbortController().signal,
      run: async (job) => {
        seen.push(job);
      },
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never has more than three calls in flight, and starts the next as one finishes', async () => {
    const { wait, releases } = held();
    let inFlight = 0;
    let peak = 0;
    const started: number[] = [];

    const running = runAiTasks({
      jobs: [1, 2, 3, 4, 5, 6, 7],
      signal: new AbortController().signal,
      run: async (job) => {
        started.push(job);
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await wait();
        inFlight -= 1;
      },
    });
    await Promise.resolve();

    expect(AI_CONCURRENCY).toBe(3);
    expect(started).toEqual([1, 2, 3]);

    releases[0]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([1, 2, 3, 4]);

    while (releases.length > 0 || started.length < 7) {
      releases.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
    await running;

    expect(peak).toBe(3);
    expect(started).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('starts nothing new once the signal aborts, and lets the calls in flight finish', async () => {
    const controller = new AbortController();
    const { wait, releases } = held();
    const started: number[] = [];

    const running = runAiTasks({
      jobs: [1, 2, 3, 4, 5],
      signal: controller.signal,
      concurrency: 2,
      run: async (job) => {
        started.push(job);
        await wait();
      },
    });
    await Promise.resolve();
    controller.abort();
    releases.forEach((release) => release());
    await running;

    expect(started).toEqual([1, 2]);
  });

  it('starts nothing when the signal is already aborted, or there are no jobs', async () => {
    const controller = new AbortController();
    controller.abort();
    const started: number[] = [];

    await runAiTasks({
      jobs: [1, 2],
      signal: controller.signal,
      run: async (job) => {
        started.push(job);
      },
    });
    await runAiTasks({
      jobs: [],
      signal: new AbortController().signal,
      run: async (job: number) => {
        started.push(job);
      },
    });

    expect(started).toEqual([]);
  });
});
