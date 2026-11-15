export function formatPercent(ratio: number | null): string {
  if (ratio === null) return '—';

  return `${(ratio * 100).toFixed(1)}%`;
}
