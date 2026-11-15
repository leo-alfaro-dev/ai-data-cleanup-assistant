/**
 * Jaro-Winkler similarity of two strings read as code points, from 0 to 1. Two empty strings
 * are identical; an empty string and any other share nothing. The prefix bonus (0.1 per shared
 * leading character, up to four) applies only above a Jaro score of 0.7.
 */
export function jaroWinkler({
  left,
  right,
}: {
  left: string;
  right: string;
}): number {
  if (left === right) return 1;

  const leftCharacters = [...left];
  const rightCharacters = [...right];
  if (leftCharacters.length === 0 || rightCharacters.length === 0) return 0;

  const jaro = toJaro({ left: leftCharacters, right: rightCharacters });
  if (jaro <= BOOST_THRESHOLD) return jaro;

  const prefixLength = countSharedPrefix({
    left: leftCharacters,
    right: rightCharacters,
  });

  return jaro + prefixLength * PREFIX_SCALE * (1 - jaro);
}

const BOOST_THRESHOLD = 0.7;
const PREFIX_SCALE = 0.1;
const MAX_PREFIX_LENGTH = 4;

function toJaro({
  left,
  right,
}: {
  left: readonly string[];
  right: readonly string[];
}): number {
  const matchDistance = Math.max(
    Math.floor(Math.max(left.length, right.length) / 2) - 1,
    0
  );
  const isRightMatched = right.map(() => false);
  const leftMatches: string[] = [];

  for (const [index, character] of left.entries()) {
    const start = Math.max(index - matchDistance, 0);
    const end = Math.min(index + matchDistance, right.length - 1);

    for (let other = start; other <= end; other++) {
      if (isRightMatched[other] || right[other] !== character) continue;

      isRightMatched[other] = true;
      leftMatches.push(character);
      break;
    }
  }

  const matchCount = leftMatches.length;
  if (matchCount === 0) return 0;

  const rightMatches = right.filter((_, index) => isRightMatched[index]);
  const outOfOrder = leftMatches.filter(
    (character, index) => character !== rightMatches[index]
  ).length;
  const transpositions = outOfOrder / 2;

  return (
    (matchCount / left.length +
      matchCount / right.length +
      (matchCount - transpositions) / matchCount) /
    3
  );
}

function countSharedPrefix({
  left,
  right,
}: {
  left: readonly string[];
  right: readonly string[];
}): number {
  const limit = Math.min(MAX_PREFIX_LENGTH, left.length, right.length);
  let length = 0;
  while (length < limit && left[length] === right[length]) length++;

  return length;
}
