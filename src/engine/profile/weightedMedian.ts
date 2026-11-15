export function weightedMedian(weights: ReadonlyMap<number, number>): number {
  const sorted = Float64Array.from(weights.keys()).sort();
  let total = 0;
  for (const weight of weights.values()) total += weight;

  const lower = valueAtRank({
    sorted,
    weights,
    rank: Math.floor((total - 1) / 2),
  });
  const upper = valueAtRank({ sorted, weights, rank: Math.floor(total / 2) });

  return (lower + upper) / 2;
}

function valueAtRank({
  sorted,
  weights,
  rank,
}: {
  sorted: Float64Array;
  weights: ReadonlyMap<number, number>;
  rank: number;
}): number {
  let seen = 0;
  let found = 0;

  for (const value of sorted) {
    found = value;
    seen += weights.get(value) ?? 0;
    if (seen > rank) break;
  }

  return found;
}
