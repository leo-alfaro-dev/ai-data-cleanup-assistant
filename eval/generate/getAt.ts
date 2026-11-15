export function getAt<Item>({
  items,
  index,
}: {
  items: readonly Item[];
  index: number;
}): Item {
  const item = items[index];
  if (item === undefined) throw new Error(`No item at index ${index}`);

  return item;
}
