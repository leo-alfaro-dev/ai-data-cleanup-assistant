import { describe, expect, it } from 'vitest';
import { createRandom } from './createRandom';

describe('createRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRandom(7);
    const second = createRandom(7);

    expect(draw({ random: first, count: 20 })).toEqual(
      draw({ random: second, count: 20 })
    );
  });

  it('gives a different sequence for a different seed', () => {
    expect(draw({ random: createRandom(1), count: 20 })).not.toEqual(
      draw({ random: createRandom(2), count: 20 })
    );
  });

  describe('integer', () => {
    it('stays inside the inclusive range and reaches both ends', () => {
      const values = draw({ random: createRandom(3), count: 500 });

      expect(Math.min(...values)).toBe(0);
      expect(Math.max(...values)).toBe(9);
    });

    it('returns the only value of a one-value range', () => {
      expect(createRandom(3).integer({ min: 4, max: 4 })).toBe(4);
    });
  });

  describe('pick', () => {
    it('returns an item of the list', () => {
      const random = createRandom(5);

      for (let attempt = 0; attempt < 50; attempt += 1) {
        expect(['a', 'b', 'c']).toContain(random.pick(['a', 'b', 'c']));
      }
    });

    it('throws on an empty list', () => {
      expect(() => createRandom(5).pick([])).toThrow('empty list');
    });
  });

  describe('pickWeighted', () => {
    it('never picks an item with no weight', () => {
      const random = createRandom(11);
      const picks = Array.from({ length: 200 }, () =>
        random.pickWeighted({
          items: [
            { name: 'never', weight: 0 },
            { name: 'always', weight: 1 },
          ],
          weightOf: (item) => item.weight,
        })
      );

      expect(new Set(picks.map((item) => item.name))).toEqual(
        new Set(['always'])
      );
    });

    it('follows the weights', () => {
      const random = createRandom(11);
      const picks = Array.from({ length: 4000 }, () =>
        random.pickWeighted({
          items: [
            { name: 'heavy', weight: 3 },
            { name: 'light', weight: 1 },
          ],
          weightOf: (item) => item.weight,
        })
      );
      const heavyShare =
        picks.filter((item) => item.name === 'heavy').length / picks.length;

      expect(heavyShare).toBeGreaterThan(0.7);
      expect(heavyShare).toBeLessThan(0.8);
    });
  });

  describe('shuffle', () => {
    it('returns the same items in another order and leaves the input alone', () => {
      const items = Array.from({ length: 30 }, (_, index) => index);
      const shuffled = createRandom(13).shuffle(items);

      expect([...shuffled].sort((first, second) => first - second)).toEqual(
        items
      );
      expect(shuffled).not.toEqual(items);
      expect(items[0]).toBe(0);
    });
  });

  describe('sample', () => {
    it('returns distinct items from the list', () => {
      const items = Array.from({ length: 30 }, (_, index) => index);
      const sampled = createRandom(17).sample({ items, count: 10 });

      expect(sampled).toHaveLength(10);
      expect(new Set(sampled).size).toBe(10);
      expect(sampled.every((item) => items.includes(item))).toBe(true);
    });

    it('throws when asked for more items than exist', () => {
      expect(() =>
        createRandom(17).sample({ items: [1, 2], count: 3 })
      ).toThrow('Cannot sample 3 of 2');
    });
  });
});

function draw({
  random,
  count,
}: {
  random: ReturnType<typeof createRandom>;
  count: number;
}): number[] {
  return Array.from({ length: count }, () =>
    random.integer({ min: 0, max: 9 })
  );
}
