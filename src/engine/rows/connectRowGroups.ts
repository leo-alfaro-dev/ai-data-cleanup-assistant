import type { RowId } from '@/engine/dataset/dataset';

/**
 * Merges groups that share a row into one. Each result lists its rows ascending, and the
 * results are ordered by their first row.
 */
export function connectRowGroups(
  groups: readonly (readonly RowId[])[]
): RowId[][] {
  const parents = new Map<RowId, RowId>();

  for (const [first, ...others] of groups) {
    if (first === undefined) continue;

    for (const other of others) {
      const firstRoot = findRoot({ parents, rowId: first });
      const otherRoot = findRoot({ parents, rowId: other });
      if (firstRoot !== otherRoot) parents.set(otherRoot, firstRoot);
    }
  }

  const components = new Map<RowId, Set<RowId>>();
  for (const rowId of groups.flat()) {
    const root = findRoot({ parents, rowId });
    const component = components.get(root) ?? new Set<RowId>();
    components.set(root, component);
    component.add(rowId);
  }

  return [...components.values()]
    .map((component) => [...component].sort((first, second) => first - second))
    .sort((first, second) => (first[0] ?? 0) - (second[0] ?? 0));
}

function findRoot({
  parents,
  rowId,
}: {
  parents: Map<RowId, RowId>;
  rowId: RowId;
}): RowId {
  let root = rowId;
  for (let parent = parents.get(root); parent !== undefined;) {
    root = parent;
    parent = parents.get(root);
  }

  let current = rowId;
  while (current !== root) {
    const parent = parents.get(current) ?? root;
    parents.set(current, root);
    current = parent;
  }

  return root;
}
