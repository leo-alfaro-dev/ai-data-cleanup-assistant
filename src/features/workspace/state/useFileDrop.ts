import { useState } from 'react';
import { workspaceActions } from './workspaceStore';

type DropHandlers = {
  onDragOver: React.DragEventHandler<HTMLElement>;
  onDragLeave: React.DragEventHandler<HTMLElement>;
  onDrop: React.DragEventHandler<HTMLElement>;
};

/** Drag-and-drop handlers that load the dropped CSV, and whether a file is being dragged over. */
export function useFileDrop(): { isDragging: boolean; handlers: DropHandlers } {
  const [isDragging, setIsDragging] = useState(false);

  return {
    isDragging,
    handlers: {
      onDragOver(event) {
        event.preventDefault();
        setIsDragging(true);
      },
      onDragLeave(event) {
        const isStillInside =
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget);
        if (!isStillInside) setIsDragging(false);
      },
      onDrop(event) {
        event.preventDefault();
        setIsDragging(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) void workspaceActions.loadFiles(files);
      },
    },
  };
}
