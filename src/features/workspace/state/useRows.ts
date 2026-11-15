import { useMemo } from 'react';
import type { Row, RowId } from '@/engine/dataset/dataset';
import { readRow } from './readRow';
import { useRowChunks } from './useRowChunks';

// An undefined entry is a row whose chunk has not arrived.
export function useRows(rowIds: readonly RowId[]): (Row | undefined)[] {
  const chunks = useRowChunks();

  return useMemo(
    () => rowIds.map((rowId) => readRow({ chunks, rowId })),
    [chunks, rowIds]
  );
}
