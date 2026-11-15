import type { CellValue } from '@/engine/changes/change';
import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { isBlank } from '@/engine/values/isBlank';
import { isEmail } from '@/engine/values/isEmail';
import { isPlaceholder } from '@/engine/values/isPlaceholder';
import { toDomainCorrections } from '@/engine/values/toDomainCorrections';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('invalid-emails');

export const findInvalidEmails: Check = {
  id,
  category: 'suspicious',
  find({ dataset, profile }) {
    return profile.flatMap(({ column, dominantType }) =>
      dominantType === 'email'
        ? findInColumn({ rows: dataset.rows, column })
        : []
    );
  },
};

function findInColumn({
  rows,
  column,
}: {
  rows: Dataset['rows'];
  column: ColumnKey;
}): Issue[] {
  const { invalidRows, rowsByDomain, invalidRowsByDomain } = scanColumn({
    rows,
    column,
  });
  const corrections = toDomainCorrections({
    domainCounts: new Map(
      [...rowsByDomain].map(([domain, domainRows]) => [
        domain,
        domainRows.length,
      ])
    ),
    candidates: invalidRowsByDomain.keys(),
  });
  const listRowsWithDomain = (domain: string): RowId[] => [
    ...(rowsByDomain.get(domain) ?? []),
    ...(invalidRowsByDomain.get(domain) ?? []),
  ];

  const cells: CellValue[] = [];
  const correctedRows = new Set<RowId>();
  for (const [domain, correctedDomain] of corrections) {
    for (const rowId of listRowsWithDomain(domain)) {
      const address = (rows[rowId]?.[column] ?? '').trim();
      const localPart = address.slice(0, address.indexOf('@'));
      cells.push({ rowId, column, value: `${localPart}@${correctedDomain}` });
      correctedRows.add(rowId);
    }
  }
  cells.sort((first, second) => first.rowId - second.rowId);
  const uncorrectedRows = invalidRows.filter(
    (rowId) => !correctedRows.has(rowId)
  );

  const issues: Issue[] = [];
  if (uncorrectedRows.length > 0) {
    issues.push({
      id: toIssueId(`${id}:${column}`),
      category: 'suspicious',
      source: 'check',
      confidence: 'high',
      rows: uncorrectedRows,
      column,
      suggestion: null,
      details: { kind: 'invalidEmails' },
    });
  }
  if (cells.length > 0) {
    issues.push({
      id: toIssueId(`${id}:${column}:domain-typos`),
      category: 'suspicious',
      source: 'check',
      confidence: 'high',
      rows: cells.map(({ rowId }) => rowId),
      column,
      suggestion: { kind: 'setCells', cells },
      details: {
        kind: 'emailDomainTypos',
        corrections: [...corrections].map(([domain, correctedDomain]) => ({
          domain,
          correctedDomain,
          count: listRowsWithDomain(domain).length,
        })),
      },
    });
  }

  return issues;
}

// A value with one at sign and a local part without spaces has a domain worth correcting, even
// when the value fails the pattern (`jo@examplecom`).
const ADDRESS_WITH_DOMAIN = /^[^\s@]+@([^@]+)$/;

function scanColumn({
  rows,
  column,
}: {
  rows: Dataset['rows'];
  column: ColumnKey;
}): {
  invalidRows: RowId[];
  rowsByDomain: Map<string, RowId[]>;
  invalidRowsByDomain: Map<string, RowId[]>;
} {
  const invalidRows: RowId[] = [];
  const rowsByDomain = new Map<string, RowId[]>();
  const invalidRowsByDomain = new Map<string, RowId[]>();

  rows.forEach((row, index) => {
    const value = row[column] ?? '';
    const rowId = toRowId(index);

    if (isEmail(value)) {
      const address = value.trim();
      addToGroup({
        groups: rowsByDomain,
        key: address.slice(address.indexOf('@') + 1),
        rowId,
      });
      return;
    }

    const isInvalid = !isBlank(value) && !isPlaceholder(value);
    if (!isInvalid) return;

    invalidRows.push(rowId);
    const domain = ADDRESS_WITH_DOMAIN.exec(value.trim())?.[1];
    if (domain !== undefined) {
      addToGroup({ groups: invalidRowsByDomain, key: domain, rowId });
    }
  });

  return { invalidRows, rowsByDomain, invalidRowsByDomain };
}

function addToGroup({
  groups,
  key,
  rowId,
}: {
  groups: Map<string, RowId[]>;
  key: string;
  rowId: RowId;
}): void {
  const group = groups.get(key) ?? [];
  groups.set(key, group);
  group.push(rowId);
}
