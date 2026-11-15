import type { Random } from './random';

// Mulberry32: a seed fixes the whole sequence.
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };

  const integer: Random['integer'] = ({ min, max }) =>
    min + Math.floor(next() * (max - min + 1));

  const pick: Random['pick'] = (items) => {
    const item = items[integer({ min: 0, max: items.length - 1 })];
    if (item === undefined) throw new Error('Cannot pick from an empty list');

    return item;
  };

  const pickWeighted: Random['pickWeighted'] = ({ items, weightOf }) => {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    const threshold = next() * total;

    let cumulative = 0;
    const chosen = items.find((item) => {
      cumulative += weightOf(item);
      return threshold < cumulative;
    });
    if (chosen === undefined) throw new Error('Cannot pick from an empty list');

    return chosen;
  };

  const shuffle: Random['shuffle'] = (items) =>
    items
      .map((item) => ({ item, key: next() }))
      .sort((first, second) => first.key - second.key)
      .map(({ item }) => item);

  const sample: Random['sample'] = ({ items, count }) => {
    if (count > items.length) {
      throw new Error(`Cannot sample ${count} of ${items.length} items`);
    }

    return shuffle(items).slice(0, count);
  };

  return { integer, pick, pickWeighted, shuffle, sample };
}

const MULBERRY_INCREMENT = 0x6d2b79f5;

const UINT32_RANGE = 2 ** 32;
