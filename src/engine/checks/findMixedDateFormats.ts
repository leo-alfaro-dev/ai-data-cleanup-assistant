import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import type { DateFormat } from '@/engine/values/dateFormat';
import { isSlashDateFormat } from '@/engine/values/isSlashDateFormat';
import { parseDate } from '@/engine/values/parseDate';
import { standardizeDate } from '@/engine/values/standardizeDate';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('mixed-date-formats');

export const findMixedDateFormats: Check = {
  id,
  category: 'inconsistent',
  find({ dataset, profile }) {
    const tallies = dataset.columns.flatMap(({ key }): Tally[] => {
      const columnProfile = profile[key];
      if (!columnProfile || !mayBeMixed(columnProfile)) return [];

      return [
        {
          column: key,
          formatCounts: new Map(),
          certainDates: [],
          eitherOrderCount: 0,
          ambiguousRows: [],
        },
      ];
    });
    if (tallies.length === 0) return [];

    for (const [index, row] of dataset.rows.entries()) {
      for (const tally of tallies) {
        const value = row[tally.column] ?? '';
        const parsed = parseDate(value);
        if (!parsed) continue;

        const rowId = toRowId(index);
        if (parsed.isAmbiguous) {
          tally.ambiguousRows.push(rowId);
          continue;
        }

        tally.certainDates.push({ rowId, value });
        const [format, otherFormat] = parsed.formats;
        if (otherFormat !== undefined) {
          tally.eitherOrderCount += 1;
          continue;
        }

        tally.formatCounts.set(
          format,
          (tally.formatCounts.get(format) ?? 0) + 1
        );
      }
    }

    return tallies.flatMap(toIssues);
  },
};

// `certainDates` read as one date; `eitherOrderCount` of them fit both slash orders as the same
// day. `ambiguousRows` read as two different dates.
type Tally = {
  column: ColumnKey;
  formatCounts: Map<DateFormat, number>;
  certainDates: { rowId: RowId; value: string }[];
  eitherOrderCount: number;
  ambiguousRows: RowId[];
};

function mayBeMixed(profile: ColumnProfile): boolean {
  if (profile.dominantType !== 'date') return false;

  const { formatCounts, unknownOrderCount } = profile.dates;
  const formatCount = Object.values(formatCounts).filter(
    (count) => count > 0
  ).length;

  return formatCount > 1 || (formatCount === 1 && unknownOrderCount > 0);
}

function toIssues({
  column,
  formatCounts,
  certainDates,
  eitherOrderCount,
  ambiguousRows,
}: Tally): Issue[] {
  const dominant = findDominantFormat(formatCounts);
  if (dominant === null) return [];

  const hasOtherFormat = formatCounts.size > 1;
  const hasSlashDatesBesideOtherFormat =
    !isSlashDateFormat(dominant) &&
    (eitherOrderCount > 0 || ambiguousRows.length > 0);
  if (!hasOtherFormat && !hasSlashDatesBesideOtherFormat) return [];

  const rewrittenRows = certainDates.flatMap(({ rowId, value }) =>
    standardizeDate({ value, format: dominant }) === null ? [] : [rowId]
  );
  const usesBothSlashOrders =
    formatCounts.has('MM/DD/YYYY') && formatCounts.has('DD/MM/YYYY');
  const isAmbiguityOpen = !isSlashDateFormat(dominant) || usesBothSlashOrders;
  const listedAmbiguousRows = isAmbiguityOpen ? ambiguousRows : [];
  if (rewrittenRows.length === 0 && listedAmbiguousRows.length === 0) return [];

  const rows = [...rewrittenRows, ...listedAmbiguousRows].sort(
    (left, right) => left - right
  );

  return [
    {
      id: toIssueId(`${id}:${column}`),
      category: 'inconsistent',
      source: 'check',
      confidence: 'high',
      rows,
      column,
      suggestion:
        rewrittenRows.length > 0
          ? { kind: 'standardizeDates', column, format: dominant }
          : null,
      details: {
        kind: 'mixedDateFormats',
        dominantFormat: dominant,
        formatCounts: [...formatCounts]
          .map(([format, count]) => ({ format, count }))
          .sort((left, right) => right.count - left.count),
        eitherOrderCount,
        ambiguousRows: listedAmbiguousRows,
      },
    },
  ];
}

// A tie goes to the format seen first in the file, which is where the map starts.
function findDominantFormat(
  formatCounts: ReadonlyMap<DateFormat, number>
): DateFormat | null {
  let dominant: DateFormat | null = null;
  let highestCount = 0;

  for (const [format, count] of formatCounts) {
    if (count <= highestCount) continue;

    dominant = format;
    highestCount = count;
  }

  return dominant;
}
