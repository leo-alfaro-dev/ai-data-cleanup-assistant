import { createGlobalState } from 'react-global-state-hooks';
import type { AiModelId } from '@/ai/models';
import { DEFAULT_AI_MODEL_ID } from '@/ai/models';

export const settingsStore$ = createGlobalState(makeInitialState(), {
  actions: {
    selectModel(modelId: AiModelId) {
      return (store) => store.setState({ modelId });
    },
  },
});

export const settingsActions = settingsStore$.actions;

export const useModelId = settingsStore$.createSelectorHook(
  (state) => state.modelId
);

function makeInitialState(): { modelId: AiModelId } {
  return { modelId: DEFAULT_AI_MODEL_ID };
}
