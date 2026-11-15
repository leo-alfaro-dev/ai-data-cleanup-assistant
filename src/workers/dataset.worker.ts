import { defineWorker } from 'easy-web-worker/defineWorker';
import type { WorkerMethodMessage } from 'easy-web-worker/types';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Change } from '@/engine/changes/change';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { previewChange } from '@/engine/changes/previewChange';
import type { AnalysisResult } from '@/engine/analysis/analysisResult';
import { CHECKS } from '@/engine/checks/checks';
import type { Dataset, Row } from '@/engine/dataset/dataset';
import { decodeText } from '@/engine/dataset/decodeText';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { isBinaryFile } from '@/engine/dataset/isBinaryFile';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';
import { parseCsv } from '@/engine/dataset/parseCsv';
import type { CleanedFiles } from '@/engine/export/cleanedFiles';
import { exportCleanedFiles } from '@/engine/export/exportCleanedFiles';
import type { Recipe } from '@/engine/recipe/recipe';
import { replayRecipe } from '@/engine/recipe/replayRecipe';
import type { ReplayResult } from '@/engine/recipe/replayResult';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue } from '@/engine/issues/issue';
import { findNearDuplicateCandidates } from '@/engine/matching/findNearDuplicateCandidates';
import { profileDataset } from '@/engine/profile/profileDataset';
import type { AiRequests } from '@/ai/aiRequests';
import type { AiTaskResult } from '@/ai/aiTaskResult';
import { buildAssessSuspiciousRowsRequests } from '@/ai/tasks/assessSuspiciousRows/buildAssessSuspiciousRowsRequests';
import { toAssessSuspiciousRowsIssues } from '@/ai/tasks/assessSuspiciousRows/toAssessSuspiciousRowsIssues';
import { buildConfirmDuplicatesRequests } from '@/ai/tasks/confirmDuplicates/buildConfirmDuplicatesRequests';
import { toConfirmDuplicatesIssues } from '@/ai/tasks/confirmDuplicates/toConfirmDuplicatesIssues';
import { buildNormalizeValuesRequests } from '@/ai/tasks/normalizeValues/buildNormalizeValuesRequests';
import { toNormalizeValuesIssues } from '@/ai/tasks/normalizeValues/toNormalizeValuesIssues';
import type { NearDuplicateCandidate } from '@/engine/matching/nearDuplicateCandidate';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { tryCatch } from '@/lib/tryCatch';
import type { LoadStage } from './loadStage';
import { LOAD_STAGES } from './loadStage';
import { pauseForCancel } from './pauseForCancel';
import { toAnalysisProgress } from './toAnalysisProgress';

let dataset: Dataset | null = null;
let fileName = '';
let profile: readonly ColumnProfile[] | null = null;
let candidates: readonly NearDuplicateCandidate[] | null = null;
let checkIssues: readonly Issue[] | null = null;

export const datasetWorker = defineWorker(({ onMessage }) => ({
  load: onMessage(
    async (
      file: File,
      message
    ): Promise<
      { ok: true; facts: FileFacts } | { ok: false; reason: LoadFailureReason }
    > => {
      dataset = null;
      fileName = file.name;
      profile = null;
      candidates = null;
      checkIssues = null;
      if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'tooLarge' };

      await enterStage({ stage: 'reading', message });
      const { result: buffer, error } = await tryCatch(() =>
        file.arrayBuffer()
      );
      if (error) return { ok: false, reason: 'unreadable' };

      const bytes = new Uint8Array(buffer);
      if (isBinaryFile(bytes)) return { ok: false, reason: 'notCsv' };

      await enterStage({ stage: 'decoding', message });
      const text = decodeText(bytes);

      await enterStage({ stage: 'parsing', message });
      const parsed = parseCsv(text);
      if (!parsed.ok) return parsed;

      dataset = parsed.dataset;

      return {
        ok: true,
        facts: {
          fileName: file.name,
          rowCount: dataset.rows.length,
          columns: dataset.columns,
          format: dataset.format,
        },
      };
    }
  ),

  rows: ({ offset, limit }: { offset: number; limit: number }): Row[] =>
    dataset?.rows.slice(offset, offset + limit) ?? [],

  analyze: onMessage(
    async (_payload: null, message): Promise<AnalysisResult | null> => {
      const current = dataset;
      if (!current) return null;

      const finishStep = async (completed: number) => {
        await pauseForCancel(message);
        const { percentage, stage } = toAnalysisProgress({
          completed,
          checkCount: CHECKS.length,
        });
        message.reportProgress(percentage, stage);
      };

      const columnProfile = profileDataset(current);
      if (dataset === current) profile = columnProfile;
      await finishStep(1);

      const issues: Issue[] = [];
      for (const [index, check] of CHECKS.entries()) {
        issues.push(
          ...check.find({ dataset: current, profile: columnProfile })
        );
        await finishStep(index + 2);
      }

      const nearDuplicates = findNearDuplicateCandidates({
        dataset: current,
        profile: columnProfile,
      });
      if (dataset === current) {
        candidates = nearDuplicates;
        checkIssues = issues;
      }
      await finishStep(CHECKS.length + 2);

      return { profile: columnProfile, issues, candidates: nearDuplicates };
    }
  ),

  buildAiRequests: (): AiRequests | null =>
    dataset && profile
      ? {
          normalizeValues: buildNormalizeValuesRequests({
            profile,
            headers: dataset.columns.map(({ header }) => header),
            rowCount: dataset.rows.length,
          }),
          confirmDuplicates: buildConfirmDuplicatesRequests({
            dataset,
            candidates: candidates ?? [],
          }),
          assessSuspiciousRows: buildAssessSuspiciousRowsRequests({
            dataset,
            profile,
            issues: checkIssues ?? [],
          }),
        }
      : null,

  buildAiIssues: (
    taskResult: AiTaskResult
  ): { issues: Issue[]; notes: AiNote[] } => {
    if (!dataset) return { issues: [], notes: [] };

    switch (taskResult.task) {
      case 'normalizeValues':
        return {
          issues: toNormalizeValuesIssues({
            result: taskResult.result,
            dataset,
          }),
          notes: [],
        };
      case 'confirmDuplicates':
        return {
          issues: toConfirmDuplicatesIssues({
            result: taskResult.result,
            dataset,
          }),
          notes: [],
        };
      case 'assessSuspiciousRows':
        return toAssessSuspiciousRowsIssues({
          result: taskResult.result,
          dataset,
        });
    }
  },

  preview: (change: Change): ChangePreview | null =>
    dataset ? previewChange({ change, dataset }) : null,

  exportFiles: ({
    accepted,
    createdAt,
  }: {
    accepted: AcceptedChange[];
    createdAt: string;
  }): CleanedFiles | null =>
    dataset
      ? exportCleanedFiles({
          dataset,
          accepted,
          recipeSource: { fileName, createdAt },
        })
      : null,

  replayRecipe: (recipe: Recipe): ReplayResult | null =>
    dataset ? replayRecipe({ dataset, recipe }) : null,
}));

export type DatasetWorker = typeof datasetWorker;

async function enterStage({
  stage,
  message,
}: {
  stage: LoadStage;
  message: WorkerMethodMessage<File>;
}) {
  await pauseForCancel(message);

  message.reportProgress(
    (LOAD_STAGES.indexOf(stage) / LOAD_STAGES.length) * 100,
    stage
  );
}
