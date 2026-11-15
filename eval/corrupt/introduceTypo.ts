import type { Random } from '../generate/random';

// The first character stays, so a name keeps its capital; the result is exactly one edit away.
export function introduceTypo({
  value,
  random,
}: {
  value: string;
  random: Random;
}): string {
  if (value.length < 2) {
    throw new Error(`Cannot introduce a typo in "${value}"`);
  }

  const head = value.slice(0, 1);
  const tail = value.slice(1);
  const swapIndexes = listSwapIndexes(tail);
  const kinds: readonly (typeof TYPO_KINDS)[number][] =
    swapIndexes.length > 0
      ? TYPO_KINDS
      : TYPO_KINDS.filter((kind) => kind !== 'swap');

  const kind = random.pick(kinds);
  const index = random.integer({ min: 0, max: tail.length - 1 });
  const before = tail.slice(0, index);

  const editedTail = (() => {
    switch (kind) {
      case 'delete':
        return before + tail.slice(index + 1);
      case 'insert':
        return before + random.pick(LETTERS) + tail.slice(index);
      case 'substitute': {
        const replaced = tail.charAt(index).toLowerCase();
        const letter = random.pick(
          LETTERS.filter((other) => other !== replaced)
        );

        return before + letter + tail.slice(index + 1);
      }
      case 'swap': {
        const swapIndex = random.pick(swapIndexes);

        return (
          tail.slice(0, swapIndex) +
          tail.charAt(swapIndex + 1) +
          tail.charAt(swapIndex) +
          tail.slice(swapIndex + 2)
        );
      }
    }
  })();

  return head + editedTail;
}

const TYPO_KINDS = ['delete', 'insert', 'substitute', 'swap'] as const;

const LETTERS = [...'abcdefghijklmnopqrstuvwxyz'];

function listSwapIndexes(text: string): number[] {
  return Array.from({ length: text.length - 1 }, (_, index) => index).filter(
    (index) => text.charAt(index) !== text.charAt(index + 1)
  );
}
