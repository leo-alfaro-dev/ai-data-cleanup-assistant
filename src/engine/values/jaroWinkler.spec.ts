import { describe, expect, it } from 'vitest';
import { jaroWinkler } from './jaroWinkler';

function score(left: string, right: string): number {
  return jaroWinkler({ left, right });
}

describe('jaroWinkler', () => {
  it('matches the textbook scores', () => {
    expect(score('MARTHA', 'MARHTA')).toBeCloseTo(0.961, 3);
    expect(score('DWAYNE', 'DUANE')).toBeCloseTo(0.84, 3);
    expect(score('DIXON', 'DICKSONX')).toBeCloseTo(0.813, 3);
  });

  it('is 1 for identical strings and 0 for strings with nothing in common', () => {
    expect(score('Ada Lovelace', 'Ada Lovelace')).toBe(1);
    expect(score('abc', 'xyz')).toBe(0);
  });

  it('is symmetric, repeated characters included', () => {
    const pairs = [
      ['MARTHA', 'MARHTA'],
      ['DIXON', 'DICKSONX'],
      ['aab', 'aba'],
      ['night', 'knight'],
      ['Jon', 'Johnathan'],
    ] as const;

    for (const [left, right] of pairs) {
      expect(score(left, right)).toBe(score(right, left));
    }
  });

  it('scores a shared prefix higher than the same typo at the start', () => {
    expect(score('Jones', 'Jonas')).toBeGreaterThan(score('Jones', 'Zones'));
  });

  it('gives a prefix bonus for at most four leading characters', () => {
    const jaro = (5 / 6 + 5 / 6 + 1) / 3;

    expect(score('stream', 'streak')).toBeCloseTo(
      jaro + 4 * 0.1 * (1 - jaro),
      10
    );
  });

  it('counts half a transposition for each matched character out of order', () => {
    expect(score('123456', '231456')).toBeCloseTo((2 + 4.5 / 6) / 3, 10);
  });

  it('only matches characters within half the longer length, less one', () => {
    expect(score('12345678', '---1----')).toBeCloseTo(
      (1 / 8 + 1 / 8 + 1) / 3,
      10
    );
    expect(score('12345678', '----1---')).toBe(0);
  });

  it('gives no prefix bonus when the Jaro score is 0.7 or below', () => {
    expect(score('ab', 'ac')).toBeCloseTo(2 / 3, 10);
  });

  it('reads strings as code points, not UTF-16 units', () => {
    expect(score('😀a', '😀b')).toBe(score('xa', 'xb'));
    expect(score('café', 'cafe')).toBeCloseTo(0.8833, 4);
    expect(score('日本語', '日本語')).toBe(1);
    expect(score('日本', '日語')).toBe(score('ab', 'ac'));
  });

  it('is case and whitespace sensitive, so callers pass comparison keys', () => {
    expect(score('Ada', 'ada')).toBeLessThan(1);
    expect(score('Ada ', 'Ada')).toBeLessThan(1);
  });

  it('treats two empty strings as identical and an empty string as sharing nothing', () => {
    expect(score('', '')).toBe(1);
    expect(score('', 'a')).toBe(0);
    expect(score('a', '')).toBe(0);
  });

  it('scores single characters', () => {
    expect(score('a', 'a')).toBe(1);
    expect(score('a', 'b')).toBe(0);
  });

  it('stays within 0 and 1', () => {
    const samples = ['', 'a', 'ab', 'abab', 'zzzz', 'Jon Smith', 'John Smith'];

    for (const left of samples) {
      for (const right of samples) {
        const value = score(left, right);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
