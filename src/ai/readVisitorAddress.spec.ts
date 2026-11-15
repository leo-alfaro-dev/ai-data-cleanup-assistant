import { describe, expect, it } from 'vitest';
import { readVisitorAddress } from './readVisitorAddress';

describe('readVisitorAddress', () => {
  it('reads the first address of x-forwarded-for', () => {
    const headers = new Headers({
      'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1',
    });

    expect(readVisitorAddress(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '203.0.113.9' });

    expect(readVisitorAddress(headers)).toBe('203.0.113.9');
  });

  it('gives one shared address to a request that names none', () => {
    expect(readVisitorAddress(new Headers())).toBe('unknown');
  });
});
