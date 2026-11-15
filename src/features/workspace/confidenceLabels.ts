import type { Confidence } from '@/engine/issues/issue';

export const confidenceLabels: Record<Confidence, string> = {
  certain: 'Certain',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
