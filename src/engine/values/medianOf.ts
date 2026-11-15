// Sorts `values` in place; callers pass an array they own.
export function medianOf(values: Float64Array): number {
  values.sort();

  const middle = Math.floor(values.length / 2);
  const upper = values[middle] ?? 0;
  if (values.length % 2 === 1) return upper;

  return ((values[middle - 1] ?? 0) + upper) / 2;
}
