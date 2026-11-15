import { mkdirSync, writeFileSync } from 'node:fs';
import { createOpenRouterClient } from '@/ai/openRouterClient';
import { runChecks } from '@/engine/checks/runChecks';
import { profileDataset } from '@/engine/profile/profileDataset';
import { buildEvalJobs } from './ai/buildEvalJobs';
import { estimateCost } from './ai/estimateCost';
import { fetchModelPrices } from './ai/fetchModelPrices';
import { runModelEvaluation } from './ai/runModelEvaluation';
import { loadEvalData } from './loadEvalData';
import { DATASET_PATH, RESULTS_FOLDER, toModelResultPath } from './evalPaths';
import { formatScoreTable } from './score/formatScoreTable';
import { writeSummary } from './writeSummary';

/**
 * `--estimate` prints the calls and the cost ceiling and makes none. Otherwise each model runs the
 * dataset once, one after another, and its result file and the summary are written as it finishes.
 */
export async function runModels({
  models,
  isEstimate,
}: {
  models: readonly string[];
  isEstimate: boolean;
}): Promise<void> {
  const { dataset, truth } = loadEvalData();
  const profile = profileDataset(dataset);
  const checkIssues = runChecks({ dataset, profile });
  const jobs = buildEvalJobs({ dataset, profile, checkIssues });
  const modelPrices = await fetchModelPrices(models);

  let totalCeiling = 0;
  for (const { id, prices } of modelPrices) {
    const estimate = estimateCost({ jobs, prices });
    totalCeiling += estimate.ceiling;
    console.log(
      `${id}: ${estimate.minimumCalls} calls (at most ${estimate.maximumCalls}), about ${estimate.promptTokens} prompt tokens, cost ceiling $${estimate.ceiling.toFixed(4)}`
    );
  }
  console.log(`Total ceiling: $${totalCeiling.toFixed(4)}`);
  if (isEstimate) return;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Set OPENROUTER_API_KEY, for example in .env.');

  const client = createOpenRouterClient({ apiKey });
  mkdirSync(RESULTS_FOLDER, { recursive: true });
  for (const model of models) {
    const result = await runModelEvaluation({
      model,
      client,
      dataset,
      truth,
      datasetPath: DATASET_PATH,
      checkIssues,
      jobs,
    });
    writeFileSync(
      toModelResultPath(model),
      JSON.stringify(result, null, 2) + '\n'
    );

    console.log(
      `\n${model}: ${result.calls} calls, ${result.tokens} tokens, $${result.cost.toFixed(4)}, ${(result.wallMs / 1000).toFixed(1)} s`
    );
    for (const { task, reason } of result.failedTasks) {
      console.log(`  ${task} failed: ${reason}`);
    }
    console.log(formatScoreTable(result.scores));
    writeSummary();
  }
}
