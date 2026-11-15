export const RESULTS_FOLDER = 'eval/results';

export const CHECKS_ONLY_PATH = `${RESULTS_FOLDER}/checks-only.json`;

export const SUMMARY_PATH = `${RESULTS_FOLDER}/summary.md`;

export const DATASET_PATH = 'eval/datasets/customers.csv';

export const TRUTH_PATH = 'eval/datasets/customers.truth.json';

export function toModelResultPath(model: string): string {
  return `${RESULTS_FOLDER}/${model.replaceAll('/', '--')}.json`;
}
