import { createGlobalState } from 'react-global-state-hooks';
import type { AiModelId } from '@/ai/models';
import { DEFAULT_AI_MODEL_ID } from '@/ai/models';
import { ownKeyStorage } from './ownKeyStorage';

export const settingsStore$ = createGlobalState(makeInitialState(), {
  actions: {
    selectModel(modelId: AiModelId) {
      return (store) => store.setState({ ...store.getState(), modelId });
    },

    saveOwnKey(key: string) {
      return (store) => {
        const ownKey = key.trim() || null;
        ownKeyStorage.write(ownKey);
        store.setState((state) => ({
          ...state,
          ownKey,
          ownKeyRevision: state.ownKeyRevision + 1,
        }));
      };
    },

    removeOwnKey() {
      return (store) => {
        ownKeyStorage.write(null);
        store.setState((state) => ({
          ...state,
          ownKey: null,
          ownKeyRevision: state.ownKeyRevision + 1,
        }));
      };
    },
  },
});

export const settingsActions = settingsStore$.actions;

export const useModelId = settingsStore$.createSelectorHook(
  (state) => state.modelId
);

export const useOwnKeyRevision = settingsStore$.createSelectorHook(
  (state) => state.ownKeyRevision
);

export const useHasOwnKey = settingsStore$.createSelectorHook(
  (state) => state.ownKey !== null
);

function makeInitialState(): {
  modelId: AiModelId;
  ownKey: string | null;
  ownKeyRevision: number;
} {
  return {
    modelId: DEFAULT_AI_MODEL_ID,
    ownKey: ownKeyStorage.read(),
    ownKeyRevision: 0,
  };
}
