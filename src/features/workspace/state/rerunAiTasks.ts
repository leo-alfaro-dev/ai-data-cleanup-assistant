import { aiActions, aiStore$ } from './aiStore';
import { reviewActions } from './reviewStore';

// A new run replaces the AI issues, so the decisions made on them go with them. Decisions on check
// issues, and the calls of the earlier run, stay.
export async function rerunAiTasks(): Promise<void> {
  const aiIssueIds = aiStore$.getState().issues.map(({ id }) => id);
  reviewActions.forgetDecisions(aiIssueIds);

  await aiActions.startRun();
}
