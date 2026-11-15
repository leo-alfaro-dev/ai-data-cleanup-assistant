export function formatLatency(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;

  return `${(milliseconds / 1000).toFixed(1)} s`;
}
