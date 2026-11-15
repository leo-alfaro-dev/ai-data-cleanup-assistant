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
import type { Issue } from '@/engine/issues/issue';
import { findNearDuplicateCandidates } from '@/engine/matching/findNearDuplicateCandidates';
import { profileDataset } from '@/engine/profile/profileDataset';
import { tryCatch } from '@/lib/tryCatch';
import type { LoadStage } from './loadStage';
import { LOAD_STAGES } from './loadStage';
import { pauseForCancel } from './pauseForCancel';
import { toAnalysisProgress } from './toAnalysisProgress';

let dataset: Dataset | null = null;

export const datasetWorker = defineWorker(({ onMessage }) => ({
  load: onMessage(
    async (
      file: File,
      message
    ): Promise<
      { ok: true; facts: FileFacts } | { ok: false; reason: LoadFailureReason }
    > => {
      dataset = null;
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

      const profile = profileDataset(current);
      await finishStep(1);

      const issues: Issue[] = [];
      for (const [index, check] of CHECKS.entries()) {
        issues.push(...check.find({ dataset: current, profile }));
        await finishStep(index + 2);
      }

      const candidates = findNearDuplicateCandidates({
        dataset: current,
        profile,
      });
      await finishStep(CHECKS.length + 2);

      return { profile, issues, candidates };
    }
  ),

  preview: (change: Change): ChangePreview | null =>
    dataset ? previewChange({ change, dataset }) : null,

  exportFiles: (accepted: AcceptedChange[]): CleanedFiles | null =>
    dataset ? exportCleanedFiles({ dataset, accepted }) : null,
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
