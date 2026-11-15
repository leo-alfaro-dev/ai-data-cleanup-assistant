import type { Issue } from '@/engine/issues/issue';
import { useAiIssues } from './aiStore';
import { useCheckIssues } from './analysisStore';
import { mergeIssues } from './mergeIssues';
import { useRecipeIssues } from './recipeStore';
import { useDecisions } from './reviewStore';

export function useIssues(): readonly Issue[] {
  return mergeIssues({
    checkIssues: useCheckIssues(),
    aiIssues: useAiIssues(),
    recipeIssues: useRecipeIssues(),
    decisions: useDecisions(),
  });
}
