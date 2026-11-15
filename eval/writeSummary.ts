import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSummary } from './buildSummary';
import { checksOnlyResultSchema } from './checksOnlyResult';
import { modelResultSchema } from './modelResult';
import { CHECKS_ONLY_PATH, RESULTS_FOLDER, SUMMARY_PATH } from './evalPaths';

export function writeSummary(): void {
  const readJson = (path: string): unknown =>
    JSON.parse(readFileSync(path, 'utf8'));
  const checksOnly = checksOnlyResultSchema.parse(readJson(CHECKS_ONLY_PATH));
  const models = readdirSync(RESULTS_FOLDER)
    .filter((name) => name.endsWith('.json') && name !== 'checks-only.json')
    .map((name) =>
      modelResultSchema.parse(readJson(`${RESULTS_FOLDER}/${name}`))
    );

  writeFileSync(SUMMARY_PATH, buildSummary({ checksOnly, models }));
}
