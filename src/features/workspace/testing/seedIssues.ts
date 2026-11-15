import type { Issue } from '@/engine/issues/issue';
import { analysisStore$ } from '../state/analysisStore';
import { seedWorkspace } from './seedWorkspace';

// Replaces the issues the real checks found with the given ones, keeping the seeded file.
export function seedIssues({
  lines,
  issues,
}: {
  lines: readonly string[];
  issues: readonly Issue[];
}): void {
  seedWorkspace(...lines);

  const { phase } = analysisStore$.getState();
  if (phase.status !== 'done') return;

  analysisStore$.setState({
    phase: { status: 'done', result: { ...phase.result, issues } },
  });
}
