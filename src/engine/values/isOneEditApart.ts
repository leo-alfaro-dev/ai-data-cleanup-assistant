// One insertion, deletion, substitution or swap of two adjacent characters.
export function isOneEditApart({
  first,
  second,
}: {
  first: string;
  second: string;
}): boolean {
  if (first === second) return false;

  const [shorter, longer] =
    first.length <= second.length ? [first, second] : [second, first];
  if (longer.length - shorter.length > 1) return false;

  let prefixLength = 0;
  while (
    prefixLength < shorter.length &&
    shorter.charAt(prefixLength) === longer.charAt(prefixLength)
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < shorter.length - prefixLength &&
    shorter.charAt(shorter.length - 1 - suffixLength) ===
      longer.charAt(longer.length - 1 - suffixLength)
  ) {
    suffixLength += 1;
  }

  const shorterRest = shorter.slice(
    prefixLength,
    shorter.length - suffixLength
  );
  const longerRest = longer.slice(prefixLength, longer.length - suffixLength);

  if (longer.length !== shorter.length) {
    return shorterRest === '' && longerRest.length === 1;
  }

  const isSubstitution = shorterRest.length === 1;
  const isSwap =
    shorterRest.length === 2 &&
    shorterRest === [...longerRest].reverse().join('');

  return isSubstitution || isSwap;
}
