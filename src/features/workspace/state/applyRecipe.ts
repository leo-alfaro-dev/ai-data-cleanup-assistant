import { reviewActions } from './reviewStore';
import { recipeActions } from './recipeStore';

/** Replays the waiting recipe on the loaded file and accepts its rules as one step. */
export async function applyRecipe(): Promise<void> {
  const issues = await recipeActions.replay();

  reviewActions.acceptIssues(issues.map(({ id }) => id));
}
