import type { Row } from '@/engine/dataset/dataset';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import type { LoadStage } from '@/workers/loadStage';

export type WorkspacePhase =
  | { status: 'empty' }
  | {
      status: 'loading';
      fileName: string;
      stage: LoadStage;
      percentage: number;
    }
  | {
      status: 'ready';
      facts: FileFacts;
      rowChunks: readonly (readonly Row[])[];
    }
  | { status: 'failed'; fileName: string; reason: LoadFailureReason };
