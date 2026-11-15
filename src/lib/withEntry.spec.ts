import { describe, expect, it } from 'vitest';
import { withEntry } from './withEntry';

describe('withEntry', () => {
  it('sets an entry in a copy and leaves the original as it was', () => {
    const original = new Map([['a', 1]]);

    const next = withEntry({ map: original, key: 'b', value: 2 });

    expect([...next]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect([...original]).toEqual([['a', 1]]);
    expect(next).not.toBe(original);
  });

  it('replaces the value of an entry that exists', () => {
    const next = withEntry({ map: new Map([['a', 1]]), key: 'a', value: 5 });

    expect(next.get('a')).toBe(5);
  });

  it('removes an entry when the value is null, and tolerates one that is not there', () => {
    const original = new Map([['a', 1]]);

    expect([...withEntry({ map: original, key: 'a', value: null })]).toEqual(
      []
    );
    expect(withEntry({ map: original, key: 'z', value: null }).size).toBe(1);
  });

  it('keeps a falsy value', () => {
    const next = withEntry({
      map: new Map<string, number>(),
      key: 'a',
      value: 0,
    });

    expect(next.get('a')).toBe(0);
  });
});
