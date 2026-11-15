import { medianOf } from '@/engine/values/medianOf';

type OutlierScale = {
  lowerLimit: number;
  upperLimit: number;
  isOutlier: (number: number) => boolean;
};

/**
 * The range a column's values stay in, in the units of the column. A right-skewed positive
 * column is judged on a log scale, where its tail is not far from the rest; any other column on
 * its own scale, with a spread for each side of the median. Null when the column has no spread.
 */
export function toOutlierScale({
  values,
  isOtherwisePositive,
}: {
  values: Float64Array;
  isOtherwisePositive: boolean;
}): OutlierScale | null {
  const spread = toSpread(values);
  const isSkewed =
    isOtherwisePositive &&
    spread.upperDeviation > SKEW_RATIO * spread.lowerDeviation;
  if (!isSkewed) return toScale({ spread, isLogScale: false });

  const positives = values.filter((number) => number > 0).map(Math.log);

  return toScale({ spread: toSpread(positives), isLogScale: true });
}

// Textbook cut-off for the modified z-score (Iglewicz and Hoaglin).
const OUTLIER_THRESHOLD = 3.5;

// Puts the median absolute deviation on the scale of a standard deviation.
const MODIFIED_Z_SCALE = 0.6745;

// The upper half of the values is this many times as spread out as the lower half.
const SKEW_RATIO = 1.5;

type Spread = {
  median: number;
  lowerDeviation: number;
  upperDeviation: number;
  overallDeviation: number;
};

// A side's spread leaves out the values tied at the median, so a pile of equal values cannot
// shrink it.
function toSpread(values: Float64Array): Spread {
  const median = medianOf(Float64Array.from(values));

  return {
    median,
    overallDeviation: medianOf(
      values.map((number) => Math.abs(number - median))
    ),
    lowerDeviation: medianOf(
      values
        .filter((number) => number < median)
        .map((number) => median - number)
    ),
    upperDeviation: medianOf(
      values
        .filter((number) => number > median)
        .map((number) => number - median)
    ),
  };
}

// No side is judged more narrowly than the whole column, so a tight side cannot make the
// ordinary values around it look far from the median.
function toScale({
  spread,
  isLogScale,
}: {
  spread: Spread;
  isLogScale: boolean;
}): OutlierScale | null {
  const { median, overallDeviation } = spread;
  if (overallDeviation === 0) return null;

  const toReach = (deviation: number) =>
    (OUTLIER_THRESHOLD * Math.max(deviation, overallDeviation)) /
    MODIFIED_Z_SCALE;
  const toUnits = isLogScale ? Math.exp : (number: number) => number;
  const lowerLimit = toUnits(median - toReach(spread.lowerDeviation));
  const upperLimit = toUnits(median + toReach(spread.upperDeviation));

  return {
    lowerLimit,
    upperLimit,
    isOutlier: (number) => {
      const isScored = !isLogScale || number > 0;

      return isScored && (number < lowerLimit || number > upperLimit);
    },
  };
}
