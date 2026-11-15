import { describe, expect, it } from 'vitest';
import { toMatchKey } from './toMatchKey';

function keyOf(value: string, isPhone = false): string | null {
  return toMatchKey({ value, isPhone });
}

describe('toMatchKey', () => {
  it('folds case, padding and spacing', () => {
    expect(keyOf('  Ada.Lovelace@Example.COM ')).toBe(
      'ada.lovelace@example.com'
    );
    expect(keyOf('C-10 01')).toBe(keyOf('c-10  01'));
  });

  it('is null for a blank cell', () => {
    expect(keyOf('')).toBeNull();
    expect(keyOf(' \t')).toBeNull();
  });

  it('is null for a placeholder', () => {
    expect(keyOf('N/A')).toBeNull();
    expect(keyOf(' unknown ')).toBeNull();
    expect(keyOf('-', true)).toBeNull();
  });

  it('compares phones by their digits whatever the layout', () => {
    const layouts = [
      '(612) 555-0136',
      '612-555-0136',
      '612.555.0136',
      '612 555 0136',
    ];

    for (const layout of layouts) {
      expect(keyOf(layout, true), layout).toBe('6125550136');
    }
    expect(keyOf('+1 612 555 0136', true)).toBe('16125550136');
  });

  it('is null for a phone-column value that is too short to be a phone', () => {
    expect(keyOf('555', true)).toBeNull();
    expect(keyOf('555-01', true)).toBeNull();
  });

  it('is null for a phone-column value that is text or too long to be a phone', () => {
    expect(keyOf('ask reception', true)).toBeNull();
    expect(keyOf('call 612 555 0136', true)).toBeNull();
    expect(keyOf('1234567890123456', true)).toBeNull();
  });

  it('reads a phone written as bare digits', () => {
    expect(keyOf('6125550136', true)).toBe('6125550136');
  });

  it('keeps digits as typed outside phone columns', () => {
    expect(keyOf('(612) 555-0136')).toBe('(612) 555-0136');
  });
});
