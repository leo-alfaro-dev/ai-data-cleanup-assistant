import { applyBatch } from './applyBatch';
import type { ReviewState } from './reviewState';

/** Moves one batch between the undo and redo stacks and applies the side it restores. */
export function stepHistory({
  state,
  direction,
}: {
  state: ReviewState;
  direction: 'undo' | 'redo';
}): ReviewState {
  const isUndo = direction === 'undo';
  const from = isUndo ? state.undoStack : state.redoStack;
  const batch = from.at(-1);
  if (!batch) return state;

  const rest = from.slice(0, -1);
  const decisions = applyBatch({
    decisions: state.decisions,
    batch,
    side: isUndo ? 'before' : 'after',
  });

  const [undoStack, redoStack] = isUndo
    ? [rest, [...state.redoStack, batch]]
    : [[...state.undoStack, batch], rest];

  return {
    ...state,
    decisions,
    undoStack,
    redoStack,
    lastStep: {
      kind: isUndo ? 'undone' : 'redone',
      count: batch.length,
      undoDepth: undoStack.length,
    },
  };
}
