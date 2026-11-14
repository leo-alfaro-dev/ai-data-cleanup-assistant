export const LOAD_STAGES = ['reading', 'decoding', 'parsing'] as const;

export type LoadStage = (typeof LOAD_STAGES)[number];
