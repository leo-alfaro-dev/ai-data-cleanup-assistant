import type { Row, RowId } from '@/engine/dataset/dataset';
import { ROW_CHUNK_SIZE } from './workspaceStore';

export function readRow({
  chunks,
  rowId,
}: {
  chunks: readonly (readonly Row[])[];
  rowId: RowId;
}): Row | undefined {
  return chunks[Math.floor(rowId / ROW_CHUNK_SIZE)]?.[rowId % ROW_CHUNK_SIZE];
}
