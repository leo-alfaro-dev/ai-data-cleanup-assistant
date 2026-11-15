import type { ChangePreview } from '@/engine/changes/changePreview';

export type PreviewEntry =
  | { status: 'loading' }
  | { status: 'ready'; preview: ChangePreview }
  | { status: 'failed' };
