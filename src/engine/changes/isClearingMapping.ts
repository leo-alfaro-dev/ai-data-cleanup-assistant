/** A mapping that turns values into empty cells, as the placeholder rules do. */
export function isClearingMapping({
  groups,
}: {
  groups: readonly { canonical: string }[];
}): boolean {
  return groups.every(({ canonical }) => canonical === '');
}
