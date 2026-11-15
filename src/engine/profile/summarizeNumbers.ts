import { parseNumber } from '@/engine/values/parseNumber';
import type { NumberSummary } from './columnProfile';
import { weightedMedian } from './weightedMedian';

export function summarizeNumbers({
  keys,
  counts,
}: {
  keys: readonly string[];
  counts: ReadonlyMap<string, number>;
}): NumberSummary {
  const weights = new Map<number, number>();
  let count = 0;
  let minimum = Infinity;
  let maximum = -Infinity;

  for (const key of keys) {
    const number = parseNumber(key);
    if (number === null) continue;

    const weight = counts.get(key) ?? 0;
    weights.set(number, (weights.get(number) ?? 0) + weight);
    count += weight;
    minimum = Math.min(minimum, number);
    maximum = Math.max(maximum, number);
  }

  const median = weightedMedian(weights);
  const deviations = new Map<number, number>();
  for (const [number, weight] of weights) {
    const deviation = Math.abs(number - median);
    deviations.set(deviation, (deviations.get(deviation) ?? 0) + weight);
  }

  return {
    count,
    minimum,
    maximum,
    median,
    medianAbsoluteDeviation: weightedMedian(deviations),
  };
}
