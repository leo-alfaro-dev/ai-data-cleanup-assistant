import type { RowId } from '@/engine/dataset/dataset';
import { isPlaceholder } from '@/engine/values/isPlaceholder';

type SpellingGroup = {
  canonical: { value: string; rows: readonly RowId[] };
  variants: readonly { value: string; rows: readonly RowId[] }[];
};

// The first spelling inserted into a group is the first one seen in the file, and wins a tie.
export function toCasingGroups(
  spellingsByKey: ReadonlyMap<string, ReadonlyMap<string, readonly RowId[]>>
): SpellingGroup[] {
  const groups: SpellingGroup[] = [];

  for (const spellings of spellingsByKey.values()) {
    if (spellings.size < 2) continue;

    const [first, ...others] = [...spellings].map(([value, rows]) => ({
      value,
      rows,
    }));
    if (!first || isPlaceholder(first.value)) continue;

    const canonical = others.reduce(
      (best, spelling) =>
        spelling.rows.length > best.rows.length ? spelling : best,
      first
    );
    const variants = [first, ...others]
      .filter((spelling) => spelling !== canonical)
      .sort((left, right) => right.rows.length - left.rows.length);

    groups.push({ canonical, variants });
  }

  return groups;
}
