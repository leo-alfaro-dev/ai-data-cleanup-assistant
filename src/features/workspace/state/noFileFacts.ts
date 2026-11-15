import type { FileFacts } from '@/engine/dataset/fileFacts';

export const NO_FILE_FACTS: FileFacts = {
  fileName: '',
  rowCount: 0,
  columns: [],
  format: {
    delimiter: ',',
    lineBreak: '\n',
    hasByteOrderMark: false,
    encoding: 'utf-8',
  },
};
