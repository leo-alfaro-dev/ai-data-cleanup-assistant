import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { IssueDetails } from '@/engine/issues/issueDetails';
import { toIssueId } from '@/engine/issues/toIssueId';
import { isBlankRow } from '@/engine/rows/isBlankRow';
import { isBlank } from '@/engine/values/isBlank';
import { toComparisonKey } from '@/engine/values/toComparisonKey';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('structure');

export const findStructuralIssues: Check = {
  id,
  category: 'suspicious',
  find({ dataset }) {
    return [...draftHeaderIssues(dataset), ...draftRowIssues(dataset)].map(
      ({ name, rows, details }) => ({
        id: toIssueId(`${id}:${name}`),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows,
        column: null,
        suggestion: null,
        details,
      })
    );
  },
};

type IssueDraft = {
  name: string;
  rows: readonly RowId[];
  details: IssueDetails;
};

// Cells past the header's width belong to ragged rows, not to a header that is empty.
function draftHeaderIssues({ columns, structure }: Dataset): IssueDraft[] {
  const headers = columns.slice(0, structure.headerCellCount);
  const emptyColumns = headers
    .filter(({ header }) => isBlank(header))
    .map(({ key }) => key);

  const columnsByHeader = new Map<string, ColumnKey[]>();
  for (const { key, header } of headers) {
    if (isBlank(header)) continue;

    const headerKey = toComparisonKey(header);
    const group = columnsByHeader.get(headerKey) ?? [];
    columnsByHeader.set(headerKey, group);
    group.push(key);
  }
  const repeatedGroups = [...columnsByHeader.values()].filter(
    (group) => group.length > 1
  );

  const drafts: IssueDraft[] = [];
  if (emptyColumns.length > 0) {
    drafts.push({
      name: 'empty-headers',
      rows: [],
      details: { kind: 'emptyHeaders', columns: emptyColumns },
    });
  }
  if (repeatedGroups.length > 0) {
    drafts.push({
      name: 'repeated-headers',
      rows: [],
      details: { kind: 'repeatedHeaders', groups: repeatedGroups },
    });
  }

  return drafts;
}

function draftRowIssues({ rows, structure }: Dataset): IssueDraft[] {
  const { headerCellCount, raggedRows, blankLinesSkipped } = structure;
  const blankRows = rows.flatMap((row, index) =>
    isBlankRow(row) ? [toRowId(index)] : []
  );
  const longRowCount = raggedRows.filter(
    ({ cellCount }) => cellCount > headerCellCount
  ).length;

  const drafts: IssueDraft[] = [];
  if (raggedRows.length > 0) {
    drafts.push({
      name: 'ragged-rows',
      rows: raggedRows.map(({ rowId }) => rowId),
      details: {
        kind: 'raggedRows',
        headerCellCount,
        shortRowCount: raggedRows.length - longRowCount,
        longRowCount,
      },
    });
  }
  if (blankRows.length > 0) {
    drafts.push({
      name: 'blank-rows',
      rows: blankRows,
      details: { kind: 'blankRows' },
    });
  }
  if (blankLinesSkipped > 0) {
    drafts.push({
      name: 'skipped-blank-lines',
      rows: [],
      details: { kind: 'skippedBlankLines', count: blankLinesSkipped },
    });
  }

  return drafts;
}
