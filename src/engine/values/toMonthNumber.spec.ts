import { describe, expect, it } from 'vitest';
import { toMonthNumber } from './toMonthNumber';

describe('toMonthNumber', () => {
  it.each([
    { name: 'Jan', month: 1 },
    { name: 'January', month: 1 },
    { name: 'mar', month: 3 },
    { name: 'MARCH', month: 3 },
    { name: 'May', month: 5 },
    { name: 'Sep', month: 9 },
    { name: 'september', month: 9 },
    { name: 'Dec', month: 12 },
    { name: 'December', month: 12 },
  ])('reads $name as month $month', ({ name, month }) => {
    expect(toMonthNumber(name)).toBe(month);
  });

  it.each(['', 'Sept', 'Marc', 'Mars', 'Ma', 'Foo', '3', 'Mar.'])(
    'does not read %j',
    (name) => {
      expect(toMonthNumber(name)).toBeNull();
    }
  );
});
