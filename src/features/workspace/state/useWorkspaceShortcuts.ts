import { useShortcuts } from '@/hooks/useShortcuts';
import type { ShortcutAction } from '../shortcuts';
import { SHORTCUTS } from '../shortcuts';
import { helpActions } from './helpStore';
import { reviewActions } from './reviewStore';

const HANDLERS: Record<ShortcutAction, () => void> = {
  nextIssue: () => reviewActions.selectNeighbor(1),
  previousIssue: () => reviewActions.selectNeighbor(-1),
  accept: () => reviewActions.acceptSelected(),
  reject: () => reviewActions.rejectSelected(),
  edit: () => reviewActions.startEdit(),
  undo: () => reviewActions.undo(),
  redo: () => reviewActions.redo(),
  toggleView: () => reviewActions.toggleView(),
  jumpToGrid: () => reviewActions.jumpToSelectedRow(),
  help: () => helpActions.open(),
};

export function useWorkspaceShortcuts(): void {
  useShortcuts({ shortcuts: SHORTCUTS, handlers: HANDLERS });
}
