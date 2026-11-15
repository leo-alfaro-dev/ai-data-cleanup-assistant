import type { RowId } from '@/engine/dataset/dataset';
import { connectRowGroups } from '@/engine/rows/connectRowGroups';
import type { IdentifierGroup } from './identifierGroup';
import type { IdentifierRecord } from './identifierRecord';
import { MAX_ROWS_PER_RECORD } from './maxRowsPerRecord';

/**
 * Joins groups that share a row (the same email on one row, the same phone on another) into one
 * record each, ordered by first row. A chain that grows past `MAX_ROWS_PER_RECORD` rows is not
 * one record and is left out.
 */
export function connectIdentifierGroups(
  groups: readonly IdentifierGroup[]
): IdentifierRecord[] {
  const rowGroups = connectRowGroups(groups.map(({ rows }) => rows));
  const linksByFirstRow = new Map<RowId, IdentifierGroup[]>();
  const recordByRow = new Map<RowId, RowId>();

  for (const rowGroup of rowGroups) {
    const [first] = rowGroup;
    if (first === undefined) continue;

    linksByFirstRow.set(first, []);
    for (const rowId of rowGroup) recordByRow.set(rowId, first);
  }

  for (const group of groups) {
    const [first] = group.rows;
    const record = first === undefined ? undefined : recordByRow.get(first);
    if (record !== undefined) linksByFirstRow.get(record)?.push(group);
  }

  return rowGroups.flatMap((rowGroup): IdentifierRecord[] => {
    const [keep, ...remove] = rowGroup;
    if (keep === undefined || rowGroup.length > MAX_ROWS_PER_RECORD) return [];

    return [{ keep, remove, links: linksByFirstRow.get(keep) ?? [] }];
  });
}
