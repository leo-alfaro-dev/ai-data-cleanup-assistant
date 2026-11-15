import type { Dataset } from '@/engine/dataset/dataset';
import type { Truth } from './corrupt/truth';
import { readDataset } from './readDataset';
import { readTruth } from './readTruth';
import { DATASET_PATH, TRUTH_PATH } from './evalPaths';
import { findTruthMismatches } from './score/findTruthMismatches';

const MAX_REPORTED_MISMATCHES = 10;

export function loadEvalData(): { dataset: Dataset; truth: Truth } {
  const dataset = readDataset(DATASET_PATH);
  const truth = readTruth(TRUTH_PATH);

  const mismatches = findTruthMismatches({ truth, dataset });
  if (mismatches.length > 0) {
    const reported = mismatches.slice(0, MAX_REPORTED_MISMATCHES);
    const unreported = mismatches.length - reported.length;
    const more = unreported > 0 ? [`...and ${unreported} more.`] : [];
    throw new Error(
      [
        `${TRUTH_PATH} does not match ${DATASET_PATH}. Run yarn eval:data.`,
        ...reported,
        ...more,
      ].join('\n')
    );
  }

  return { dataset, truth };
}
