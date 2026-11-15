import { describe, expect, it } from 'vitest';
import { SIGNUP_DAY_COUNT, toSignupDate } from './toSignupDate';

describe('toSignupDate', () => {
  it('starts on 2022-01-01', () => {
    expect(toSignupDate(0)).toBe('2022-01-01');
  });

  it('ends on 2024-12-31', () => {
    expect(SIGNUP_DAY_COUNT).toBe(1096);
    expect(toSignupDate(SIGNUP_DAY_COUNT - 1)).toBe('2024-12-31');
  });

  it('counts the leap day of 2024', () => {
    expect(toSignupDate(365 + 365 + 31 + 28)).toBe('2024-02-29');
  });
});
