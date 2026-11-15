// A ratio over nothing is null, never 0: nothing claimed is not the same as everything wrong.
export function toRatio({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}): number | null {
  if (denominator === 0) return null;

  return numerator / denominator;
}
