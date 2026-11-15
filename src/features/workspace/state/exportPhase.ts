import type { CleanedFiles } from '@/engine/export/cleanedFiles';

export type ExportPhase =
  | { status: 'closed' }
  | { status: 'running' }
  // pendingCount is null when the checks did not finish, so no issue was found to be pending.
  | { status: 'ready'; files: CleanedFiles; pendingCount: number | null }
  | { status: 'failed' };
