import type { Row } from '@/engine/dataset/dataset';
import { memoizeByReference } from '@/lib/memoizeByReference';

// Every decision recompiles the plan, so the flat list of row references is built once per set of chunks.
export const flattenChunks = memoizeByReference(
  (chunks: readonly (readonly Row[])[]): readonly Row[] => chunks.flat()
);
