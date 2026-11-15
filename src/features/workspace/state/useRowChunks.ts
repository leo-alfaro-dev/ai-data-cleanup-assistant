import type { Row } from '@/engine/dataset/dataset';
import { workspaceStore$ } from './workspaceStore';

const NO_CHUNKS: readonly (readonly Row[])[] = [];

export const useRowChunks = workspaceStore$.createSelectorHook(
  (state): readonly (readonly Row[])[] =>
    state.phase.status === 'ready' ? state.phase.rowChunks : NO_CHUNKS
);
