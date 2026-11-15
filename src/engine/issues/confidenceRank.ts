import type { Confidence } from './issue';
import { CONFIDENCES } from './issue';

export function confidenceRank(confidence: Confidence): number {
  return CONFIDENCES.indexOf(confidence);
}
