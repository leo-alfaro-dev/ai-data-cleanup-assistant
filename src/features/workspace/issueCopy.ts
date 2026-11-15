import type { Column } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Issue } from '@/engine/issues/issue';
import { countOf } from '@/lib/countOf';
import { formatNumber } from '@/lib/formatNumber';
import { quote } from '@/lib/quote';
import { describeRecipeChange } from './recipeCopy';
import { toColumnLabel } from './toColumnLabel';

export function describeIssue({
  issue,
  columns,
}: {
  issue: Issue;
  columns: readonly Column[];
}): { title: string; summary: string } {
  const { details } = issue;
  const rowCount = issue.rows.length;
  const columnName =
    issue.column === null
      ? 'the file'
      : quote(toColumnLabel({ columns, column: issue.column }));

  switch (details.kind) {
    case 'exactDuplicates':
      return {
        title: 'Exact duplicate rows',
        summary: `${countOf({ count: details.groups.length, noun: 'group' })} of identical rows. The first row of each group stays.`,
      };
    case 'normalizedDuplicates':
      return {
        title: 'Duplicate rows that differ in spacing or case',
        summary: `${countOf({ count: details.groups.length, noun: 'group' })} of rows that match once spacing and case are ignored. The first row of each group stays.`,
      };
    case 'sharedIdentifiers': {
      const labels = details.links.map(({ column }) =>
        quote(toColumnLabel({ columns, column }))
      );
      const shared = details.links.map(
        ({ column, value }, index) =>
          `${index === 0 ? 'Same' : 'same'} ${toColumnLabel({ columns, column })} ${quote(value)}`
      );
      const conflict = details.hasConflictingNames
        ? ' Their names differ, so no merge is suggested.'
        : '';

      return {
        title: `Rows share ${[...new Set(labels)].join(' and ')}`,
        summary: `${shared.join(' and ')}.${conflict}`,
      };
    }
    case 'casingVariants':
      return {
        title: `Inconsistent casing in ${columnName}`,
        summary: `Variants of ${countOf({ count: details.groups.length, noun: 'value' })}. Each moves to its most common spelling.`,
      };
    case 'mixedDateFormats': {
      const otherCount = details.formatCounts
        .filter(({ format }) => format !== details.dominantFormat)
        .reduce((sum, { count }) => sum + count, 0);
      const ambiguous =
        details.ambiguousRows.length > 0
          ? ` Could be read two ways and left as written: ${countOf({ count: details.ambiguousRows.length, noun: 'date' })}.`
          : '';

      return {
        title: `Mixed date formats in ${columnName}`,
        summary: `Most dates are written ${details.dominantFormat}. Other formats: ${countOf({ count: otherCount, noun: 'date' })}.${ambiguous}`,
      };
    }
    case 'typeMismatches': {
      const others = details.mismatches
        .map(({ type, count }) => `${formatNumber(count)} ${type}`)
        .join(', ');

      return {
        title: `Values of the wrong type in ${columnName}`,
        summary: `The column is mostly ${details.expectedType} values. Others: ${others}.`,
      };
    }
    case 'whitespace': {
      const parts = [
        { count: details.paddedCount, text: 'padded' },
        { count: details.innerCount, text: 'with repeated spaces' },
        { count: details.nonBreakingCount, text: 'with non-breaking spaces' },
      ]
        .filter(({ count }) => count > 0)
        .map(({ count, text }) => `${formatNumber(count)} ${text}`);

      return {
        title: `Extra spaces in ${columnName}`,
        summary: `${parts.join(', ')}.`,
      };
    }
    case 'emptyCells':
      return {
        title: `Empty cells in ${columnName}`,
        summary: `Empty: ${formatNumber(rowCount)} of ${formatNumber(rowCount + details.filledCount)} cells.`,
      };
    case 'placeholders': {
      const shown = details.spellings
        .slice(0, MAX_LISTED_SPELLINGS)
        .map(({ value, count }) => `${quote(value)} (${formatNumber(count)})`);
      const hidden = details.spellings.length - shown.length;
      const more = hidden > 0 ? `, and ${formatNumber(hidden)} more` : '';

      return {
        title: `Placeholder values in ${columnName}`,
        summary: `Spellings of a missing value: ${shown.join(', ')}${more}.`,
      };
    }
    case 'normalizedSpellings': {
      const note = details.isCanonicalInFile
        ? ''
        : ` ${quote(details.canonical)} is not in your file.`;

      return {
        title: `Spellings of ${quote(details.canonical)} in ${columnName}`,
        summary: `${details.reason}${note}`,
      };
    }
    case 'aiPlaceholders':
      return {
        title: `Placeholder values in ${columnName}`,
        summary: details.placeholders
          .map(({ value, reason }) => `${quote(value)}: ${reason}`)
          .join(' '),
      };
    case 'confirmedDuplicate': {
      const [first, second] = issue.rows;

      return {
        title: `Rows ${first === undefined ? '' : toRowNumber(first)} and ${second === undefined ? '' : toRowNumber(second)} are the same record`,
        summary: details.reason,
      };
    }
    case 'assessedRow':
      return {
        title:
          issue.column === null
            ? 'Suspicious row'
            : `Suspicious value in ${columnName}`,
        summary: details.reason,
      };
    case 'numericOutliers':
      return {
        title: `Unusual numbers in ${columnName}`,
        summary: `The typical value is ${formatNumber(details.median)}. Outside ${formatNumber(details.lowerLimit)} to ${formatNumber(details.upperLimit)}: ${countOf({ count: rowCount, noun: 'value' })}.`,
      };
    case 'negativeValues':
      return {
        title: `Negative numbers in ${columnName}`,
        summary: `The column is otherwise positive, with a typical value of ${formatNumber(details.median)}.`,
      };
    case 'invalidEmails':
      return {
        title: `Invalid email addresses in ${columnName}`,
        summary: 'These values do not look like an email address.',
      };
    case 'emailDomainTypos': {
      const [first] = details.corrections;
      const hidden = details.corrections.length - 1;
      const example = first
        ? `${quote(first.domain)} to ${quote(first.correctedDomain)}`
        : '';
      const more = hidden > 0 ? `, and ${formatNumber(hidden)} more` : '';

      return {
        title: `Misspelled email domains in ${columnName}`,
        summary: `Domain corrections: ${example}${more}. The rest of each address stays.`,
      };
    }
    case 'formulaLikeValues':
      return {
        title: `Formula-like values in ${columnName}`,
        summary: `Starts with ${details.leadingCharacters.map(quote).join(', ')}, which a spreadsheet can run as a formula.`,
      };
    case 'raggedRows':
      return {
        title: 'Rows with the wrong number of cells',
        summary: `The header has ${formatNumber(details.headerCellCount)} cells. Short rows: ${formatNumber(details.shortRowCount)}. Long rows: ${formatNumber(details.longRowCount)}.`,
      };
    case 'emptyHeaders':
      return {
        title: 'Empty column headers',
        summary: `Columns with no header: ${details.columns.map((column) => toColumnLabel({ columns, column })).join(', ')}.`,
      };
    case 'repeatedHeaders':
      return {
        title: 'Repeated column headers',
        summary: `Headers used on more than one column: ${formatNumber(details.groups.length)}.`,
      };
    case 'recipeRule':
      return {
        title: describeRecipeChange({ change: issue.suggestion, columnName }),
        summary: 'Applied from the recipe you loaded.',
      };
    case 'blankRows':
      return {
        title: 'Blank rows',
        summary: `Rows with no values: ${formatNumber(rowCount)}.`,
      };
    case 'skippedBlankLines':
      return {
        title: 'Blank lines in the file',
        summary: `${countOf({ count: details.count, noun: 'blank line' })} skipped when reading the file.`,
      };
  }
}

const MAX_LISTED_SPELLINGS = 3;
