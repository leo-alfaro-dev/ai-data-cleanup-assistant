/**
 * `count` of the given rows, in ascending order, chosen by a seeded shuffle: the same file always
 * gives the same sample. All of them when there are no more than `count`.
 */
export function pickSampleRows({
  rowIds,
  count,
  seed,
}: {
  rowIds: readonly number[];
  count: number;
  seed: number;
}): number[] {
  if (rowIds.length <= count) return [...rowIds];

  const next = createRandom(seed);
  const pool = [...rowIds];

  for (let index = 0; index < count; index += 1) {
    const swapWith = index + Math.floor(next() * (pool.length - index));
    const picked = pool[swapWith] ?? 0;
    pool[swapWith] = pool[index] ?? 0;
    pool[index] = picked;
  }

  return pool.slice(0, count).sort((first, second) => first - second);
}

// mulberry32: a small generator that is the same in every runtime.
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
