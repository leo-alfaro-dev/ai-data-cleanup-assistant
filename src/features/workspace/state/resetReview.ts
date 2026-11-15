import { aiActions } from './aiStore';
import { analysisActions } from './analysisStore';
import { exportActions } from './exportStore';
import { previewActions } from './previewStore';
import { recipeActions } from './recipeStore';
import { reviewActions } from './reviewStore';

// Everything that belongs to the loaded file, so a new or failed load leaves none of it behind.
export function resetReview(): void {
  analysisActions.reset();
  aiActions.reset();
  reviewActions.reset();
  previewActions.reset();
  exportActions.reset();
  recipeActions.resetResult();
}
