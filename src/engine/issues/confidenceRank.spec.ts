import { describe, expect, it } from 'vitest';
import { confidenceRank } from './confidenceRank';
import { lowestConfidence } from './lowestConfidence';

describe('confidenceRank', () => {
  it('ranks the most certain first', () => {
    expect(confidenceRank('certain')).toBeLessThan(confidenceRank('high'));
    expect(confidenceRank('high')).toBeLessThan(confidenceRank('medium'));
    expect(confidenceRank('medium')).toBeLessThan(confidenceRank('low'));
  });
});

describe('lowestConfidence', () => {
  it('returns the least certain of the given confidences', () => {
    expect(lowestConfidence(['high', 'low', 'certain'])).toBe('low');
    expect(lowestConfidence(['medium'])).toBe('medium');
  });
});
