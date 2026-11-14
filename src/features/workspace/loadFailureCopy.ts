import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';

export const loadFailureCopy: Record<LoadFailureReason, string> = {
  empty: 'The file is empty.',
  noDataRows: 'The file has a header row but no data rows.',
  tooLarge: `The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB, the most this app loads.`,
  notCsv:
    'This is not a CSV file. To clean an Excel workbook, save it as CSV first (File › Save As › CSV UTF-8) and load that file.',
  unreadable:
    'The file could not be read. Check that it still exists, then choose it again.',
};
