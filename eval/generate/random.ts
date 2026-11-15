export type Random = {
  integer(args: { min: number; max: number }): number;
  pick<Item>(items: readonly Item[]): Item;
  pickWeighted<Item>(args: {
    items: readonly Item[];
    weightOf: (item: Item) => number;
  }): Item;
  shuffle<Item>(items: readonly Item[]): Item[];
  sample<Item>(args: { items: readonly Item[]; count: number }): Item[];
};
