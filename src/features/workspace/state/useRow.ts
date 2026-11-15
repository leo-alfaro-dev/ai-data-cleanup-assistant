import type { Row, RowId } from '@/engine/dataset/dataset';
import { readRow } from './readRow';
import { useRowChunks } from './useRowChunks';

export function useRow(rowId: RowId): Row | undefined {
  return useRowChunks((chunks) => readRow({ chunks, rowId }), [rowId]);
}
