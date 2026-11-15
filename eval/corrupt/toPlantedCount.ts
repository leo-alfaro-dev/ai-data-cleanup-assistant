export function toPlantedCount({
  rate,
  total,
}: {
  rate: number;
  total: number;
}): number {
  return Math.round(rate * total);
}
