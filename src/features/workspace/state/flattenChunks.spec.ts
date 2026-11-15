import { describe, expect, it } from 'vitest';
import type { Row } from '@/engine/dataset/dataset';
import { flattenChunks } from './flattenChunks';

describe('flattenChunks', () => {
  it('lists the rows of every chunk in order, without copying a row', () => {
    const first: Row = ['a'];
    const second: Row = ['b'];
    const third: Row = ['c'];

    const rows = flattenChunks([[first, second], [third]]);

    expect(rows).toEqual([first, second, third]);
    expect(rows[1]).toBe(second);
  });

  it('gives the same list for the same chunks, and a new one for new chunks', () => {
    const chunks = [[['a']], [['b']]];

    expect(flattenChunks(chunks)).toBe(flattenChunks(chunks));
    expect(flattenChunks([...chunks])).not.toBe(flattenChunks(chunks));
  });

  it('is empty while no chunk has arrived', () => {
    expect(flattenChunks([])).toEqual([]);
  });
});
