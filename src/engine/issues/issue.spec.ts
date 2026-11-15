import { describe, expect, it } from 'vitest';
import { CONFIDENCES, ISSUE_CATEGORIES } from './issue';

describe('issue lists', () => {
  it('lists the categories in the order the brief names them', () => {
    expect(ISSUE_CATEGORIES).toEqual([
      'duplicate',
      'inconsistent',
      'missing',
      'suspicious',
    ]);
  });

  it('lists the confidences from strongest to weakest', () => {
    expect(CONFIDENCES).toEqual(['certain', 'high', 'medium', 'low']);
  });
});
