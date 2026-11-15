import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import type { Issue } from '@/engine/issues/issue';
import { parseRecipe } from '@/engine/recipe/parseRecipe';
import type { RecipeRejection } from '@/engine/recipe/parseRecipe';
import { MAX_RECIPE_BYTES } from '@/engine/recipe/parseRecipe';
import type { Recipe } from '@/engine/recipe/recipe';
import type { ReplayResult } from '@/engine/recipe/replayResult';
import { tryCatch } from '@/lib/tryCatch';
import { getDatasetWorker } from '@/workers/getDatasetWorker';

export type RecipeResult = { fileName: string } & ReplayResult;

type RecipeState = {
  // A recipe waits here until the next file is loaded.
  pending: { fileName: string; recipe: Recipe } | null;
  rejection: {
    fileName: string;
    reason: RecipeRejection | 'unreadable' | 'tooLarge';
  } | null;
  result: RecipeResult | null;
  hasReplayFailed: boolean;
};

export const recipeStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    chooseRecipe(file: File) {
      return async (store) => {
        if (file.size > MAX_RECIPE_BYTES) {
          return store.setState((state) => ({
            ...state,
            pending: null,
            rejection: { fileName: file.name, reason: 'tooLarge' },
          }));
        }

        const { result: text, error } = await tryCatch(() => file.text());
        if (error) {
          return store.setState((state) => ({
            ...state,
            pending: null,
            rejection: { fileName: file.name, reason: 'unreadable' },
          }));
        }

        const parsed = parseRecipe(text);
        store.setState((state) =>
          parsed.ok
            ? {
                ...state,
                pending: { fileName: file.name, recipe: parsed.recipe },
                rejection: null,
              }
            : {
                ...state,
                pending: null,
                rejection: { fileName: file.name, reason: parsed.reason },
              }
        );
      };
    },

    replay() {
      return async (store): Promise<readonly Issue[]> => {
        const { pending } = store.getState();
        if (!pending) return [];

        store.metadata.call?.cancel(SUPERSEDED);
        const call = getDatasetWorker().replayRecipe(pending.recipe);
        store.setMetadata({ call });
        store.setState((state) => ({
          ...state,
          pending: null,
          hasReplayFailed: false,
        }));

        const { result, error } = await tryCatch(() => call);
        if (call.status === 'canceled') return [];
        if (error || result === null) {
          store.setState((state) => ({ ...state, hasReplayFailed: true }));

          return [];
        }

        store.setState((state) => ({
          ...state,
          result: { fileName: pending.fileName, ...result },
        }));

        return result.issues;
      };
    },

    resetResult() {
      return (store) => {
        store.metadata.call?.cancel(SUPERSEDED);
        store.setMetadata(makeInitialMetadata());
        store.setState((state) => ({
          ...state,
          result: null,
          hasReplayFailed: false,
        }));
      };
    },

    reset() {
      return (store) => {
        store.metadata.call?.cancel(SUPERSEDED);
        store.setMetadata(makeInitialMetadata());
        store.setState(makeInitialState());
      };
    },
  },
});

export const recipeActions = recipeStore$.actions;

const NO_ISSUES: readonly Issue[] = [];

export const useRecipeIssues = recipeStore$.createSelectorHook(
  (state): readonly Issue[] => state.result?.issues ?? NO_ISSUES
);

export const usePendingRecipe = recipeStore$.createSelectorHook(
  (state) => state.pending
);

export const useRecipeRejection = recipeStore$.createSelectorHook(
  (state) => state.rejection
);

export const useHasReplayFailed = recipeStore$.createSelectorHook(
  (state) => state.hasReplayFailed
);

export const useRecipeResult = recipeStore$.createSelectorHook(
  (state) => state.result
);

const SUPERSEDED = 'superseded';

function makeInitialState(): RecipeState {
  return {
    pending: null,
    rejection: null,
    result: null,
    hasReplayFailed: false,
  };
}

function makeInitialMetadata(): { call: CancelablePromise<unknown> | null } {
  return { call: null };
}
