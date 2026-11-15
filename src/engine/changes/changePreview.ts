export type ChangePreview = {
  counts: PreviewCounts;
  examples: readonly PreviewExample[];
};

export type PreviewCounts = {
  cells: number;
  rows: number;
  removedRows: number;
};

export type PreviewExample = {
  before: string;
  after: string;
  cells: number;
};

export const MAX_PREVIEW_EXAMPLES = 10;
