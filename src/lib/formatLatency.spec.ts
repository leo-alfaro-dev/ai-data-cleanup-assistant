import { describe, expect, it } from 'vitest';
import { formatLatency } from './formatLatency';

describe('formatLatency', () => {
  it('shows under a second in milliseconds', () => {
    expect(formatLatency(0)).toBe('0 ms');
    expect(formatLatency(412.4)).toBe('412 ms');
  });

  it('shows a second or more in seconds with one decimal', () => {
    expect(formatLatency(1000)).toBe('1.0 s');
    expect(formatLatency(24_480)).toBe('24.5 s');
  });
});
