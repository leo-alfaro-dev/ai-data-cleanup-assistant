import type { RowId } from '@/engine/dataset/dataset';
import type { ChangePreview, PreviewExample } from './changePreview';
import { MAX_PREVIEW_EXAMPLES } from './changePreview';

export function createChangeTally(): {
  add: (changedCell: { rowId: RowId; before: string; after: string }) => void;
  toPreview: (removedRows: number) => ChangePreview;
} {
  const changedRows = new Set<RowId>();
  const examples: PreviewExample[] = [];
  const examplesByBefore = new Map<string, PreviewExample[]>();
  let cells = 0;

  return {
    add({ rowId, before, after }) {
      cells += 1;
      changedRows.add(rowId);

      const sharingBefore = examplesByBefore.get(before);
      const existing = sharingBefore?.find(
        (example) => example.after === after
      );
      if (existing) {
        existing.cells += 1;
        return;
      }

      const example = { before, after, cells: 1 };
      examples.push(example);
      if (sharingBefore) sharingBefore.push(example);
      else examplesByBefore.set(before, [example]);
    },

    toPreview(removedRows) {
      const mostFrequent = [...examples].sort(
        (first, second) => second.cells - first.cells
      );

      return {
        counts: { cells, rows: changedRows.size, removedRows },
        examples: mostFrequent.slice(0, MAX_PREVIEW_EXAMPLES),
      };
    },
  };
}
