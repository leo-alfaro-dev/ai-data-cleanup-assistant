import { confidenceRank } from './confidenceRank';
import type { Confidence } from './issue';

export function lowestConfidence(
  confidences: readonly [Confidence, ...Confidence[]]
): Confidence {
  return confidences.reduce((lowest, confidence) =>
    confidenceRank(confidence) > confidenceRank(lowest) ? confidence : lowest
  );
}
