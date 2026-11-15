import type { DistinctValue } from './columnProfile';

export function selectMostFrequent({
  counts,
  limit,
}: {
  counts: ReadonlyMap<string, number>;
  limit: number;
}): DistinctValue[] {
  const valuesByCount: string[][] = [];
  let highestCount = 0;

  for (const [value, count] of counts) {
    const values = valuesByCount[count];
    if (values) values.push(value);
    else valuesByCount[count] = [value];

    if (count > highestCount) highestCount = count;
  }

  const selected: DistinctValue[] = [];

  for (let count = highestCount; count > 0; count--) {
    const values = valuesByCount[count];
    if (!values) continue;

    for (const value of values) {
      if (selected.length === limit) return selected;
      selected.push({ value, count });
    }
  }

  return selected;
}
