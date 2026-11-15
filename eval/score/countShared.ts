export function countShared<Item>(
  first: ReadonlySet<Item>,
  second: ReadonlySet<Item>
): number {
  let shared = 0;
  for (const item of first) {
    if (second.has(item)) shared += 1;
  }

  return shared;
}
