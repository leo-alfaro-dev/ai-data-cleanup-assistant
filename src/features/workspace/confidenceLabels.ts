import type { Confidence } from '@/engine/issues/issue';

export const confidenceLabels: Record<Confidence, string> = {
  certain: 'Certain',
  high: 'Very sure',
  medium: 'Fairly sure',
  low: 'Unsure',
};
