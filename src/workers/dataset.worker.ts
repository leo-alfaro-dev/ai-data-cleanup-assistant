import { defineWorker } from 'easy-web-worker/defineWorker';
import type { WorkerMethodMessage } from 'easy-web-worker/types';
import type { Dataset, Row } from '@/engine/dataset/dataset';
import { decodeText } from '@/engine/dataset/decodeText';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { isBinaryFile } from '@/engine/dataset/isBinaryFile';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { tryCatch } from '@/lib/tryCatch';
import type { LoadStage } from './loadStage';
import { LOAD_STAGES } from './loadStage';

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
          columnCount: dataset.columns.length,
          format: dataset.format,
        },
      };
    }
  ),

  rows: ({ offset, limit }: { offset: number; limit: number }): Row[] =>
    dataset?.rows.slice(offset, offset + limit) ?? [],
}));

export type DatasetWorker = typeof datasetWorker;

// Yields so a cancel can arrive. A canceled call ignores whatever its method does next,
// so throwing is only how the work stops.
async function enterStage({
  stage,
  message,
}: {
  stage: LoadStage;
  message: WorkerMethodMessage<File>;
}) {
  await new Promise((resolve) => setTimeout(resolve));
  if (!message.isPending()) throw new Error('Load canceled');

  message.reportProgress(
    (LOAD_STAGES.indexOf(stage) / LOAD_STAGES.length) * 100,
    stage
  );
}
