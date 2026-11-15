export function elementAt(
  elements: readonly HTMLElement[],
  index: number
): HTMLElement {
  const element = elements[index];
  if (!element) throw new Error(`No element at index ${index}`);

  return element;
}
