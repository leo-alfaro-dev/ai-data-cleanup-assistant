import type { AiRun } from './aiRun';

export function isAiRunInFlight({
  isPreparing,
  run,
}: {
  isPreparing: boolean;
  run: AiRun | null;
}): boolean {
  if (isPreparing) return true;

  return (run?.jobs ?? []).some(
    ({ state }) => state.status === 'queued' || state.status === 'running'
  );
}
