import { parseArgs } from 'node:util';
import { tryCatch } from '@/lib/tryCatch';
import { runChecksOnly } from './runChecksOnly';
import { runModels } from './runModels';
import { writeSummary } from './writeSummary';

const USAGE = `Usage:
  yarn eval --checks-only
  yarn eval --models <id>,<id> --estimate
  yarn eval --models <id>,<id>
  yarn eval --summary`;

void main();

async function main(): Promise<void> {
  const { result: values, error: usageError } = tryCatch(
    () =>
      parseArgs({
        options: {
          'checks-only': { type: 'boolean' },
          models: { type: 'string' },
          estimate: { type: 'boolean' },
          summary: { type: 'boolean' },
        },
      }).values
  );
  if (usageError) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const models = [
    ...new Set(
      values.models
        ?.split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '')
    ),
  ];
  const isChecksOnly = values['checks-only'] ?? false;
  const isSummary = values.summary ?? false;
  const isEstimate = values.estimate ?? false;
  const isModelRun = models.length > 0;
  const modeCount = [isChecksOnly, isSummary, isModelRun].filter(
    Boolean
  ).length;
  const isValid = modeCount === 1 && (!isEstimate || isModelRun);
  if (!isValid) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const { error } = await tryCatch(async () => {
    if (isChecksOnly) runChecksOnly();
    if (isChecksOnly || isSummary) writeSummary();
    if (isModelRun) await runModels({ models, isEstimate });
  });
  if (!error) return;

  console.error(error.message);
  process.exitCode = 1;
}
