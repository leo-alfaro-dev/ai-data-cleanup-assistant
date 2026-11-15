import { describe, expect, it } from 'vitest';
import type { Row } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import { readRow } from './readRow';
import { ROW_CHUNK_SIZE } from './workspaceStore';

const firstChunk: Row[] = Array.from({ length: ROW_CHUNK_SIZE }, (_, index) => [
  `first-${index}`,
]);
const secondChunk: Row[] = [['second-0'], ['second-1']];

describe('readRow', () => {
  it('reads a row of the first chunk by its id', () => {
    expect(readRow({ chunks: [firstChunk], rowId: toRowId(0) })).toEqual([
      'first-0',
    ]);
    expect(
      readRow({ chunks: [firstChunk], rowId: toRowId(ROW_CHUNK_SIZE - 1) })
    ).toEqual([`first-${ROW_CHUNK_SIZE - 1}`]);
  });

  it('reads a row past the first chunk from the chunk that holds it', () => {
    const chunks = [firstChunk, secondChunk];

    expect(readRow({ chunks, rowId: toRowId(ROW_CHUNK_SIZE) })).toEqual([
      'second-0',
    ]);
    expect(readRow({ chunks, rowId: toRowId(ROW_CHUNK_SIZE + 1) })).toEqual([
      'second-1',
    ]);
  });

  it('is undefined for a row whose chunk has not arrived, or past the last row', () => {
    expect(
      readRow({ chunks: [firstChunk], rowId: toRowId(ROW_CHUNK_SIZE) })
    ).toBeUndefined();
    expect(
      readRow({
        chunks: [firstChunk, secondChunk],
        rowId: toRowId(ROW_CHUNK_SIZE + 2),
      })
    ).toBeUndefined();
    expect(readRow({ chunks: [], rowId: toRowId(0) })).toBeUndefined();
  });
});
