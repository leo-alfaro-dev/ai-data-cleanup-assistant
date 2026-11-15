import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { isIdentifierHeader } from '@/engine/values/isIdentifierHeader';
import { isNameHeader } from '@/engine/values/isNameHeader';
import { shortenValue } from '@/lib/shortenValue';
import { MAX_HEADER_LENGTH } from '../../textLimits';
import { isPersonNounHeader } from './isPersonNounHeader';
import type { NormalizeValuesRequest } from './normalizeValuesContract';
import {
  MAX_COLUMNS_PER_FILE,
  MAX_VALUE_LENGTH,
  MAX_VALUES_PER_REQUEST,
  SMALL_FILE_ROW_LIMIT,
} from './normalizeValuesContract';

/**
 * One request per text column worth normalizing, the most repeated columns first. A file under
 * SMALL_FILE_ROW_LIMIT rows has too few repeats to tell a category from free text, so there every
 * text column counts. Columns of names and identifiers are left out: two spellings of a name may
 * be two people. A value longer than the cap is not sent, never shortened.
 */
export function buildNormalizeValuesRequests({
  profile,
  headers,
  rowCount,
}: {
  profile: readonly ColumnProfile[];
  headers: readonly string[];
  rowCount: number;
}): NormalizeValuesRequest[] {
  const isSmallFile = rowCount < SMALL_FILE_ROW_LIMIT;

  return profile
    .flatMap((columnProfile) => {
      const header = headers[columnProfile.column] ?? '';
      const isCandidate =
        columnProfile.dominantType === 'text' &&
        (columnProfile.isCategorical || isSmallFile) &&
        !isIdentifierHeader(header) &&
        !isNameHeader(header) &&
        !isPersonNounHeader(header);
      const sendable = columnProfile.distinctValues.filter(
        ({ value }) => value.length <= MAX_VALUE_LENGTH
      );
      if (!isCandidate || sendable.length < 2) return [];

      const values = sendable.slice(0, MAX_VALUES_PER_REQUEST);
      const request: NormalizeValuesRequest = {
        column: {
          key: columnProfile.column,
          header: shortenValue({
            value: header,
            maxLength: MAX_HEADER_LENGTH,
          }),
          dominantType: columnProfile.dominantType,
        },
        values,
        isComplete: values.length === columnProfile.distinctCount,
      };

      return [
        {
          request,
          repetition: columnProfile.nonBlankCount / columnProfile.distinctCount,
        },
      ];
    })
    .sort(
      (first, second) =>
        second.repetition - first.repetition ||
        first.request.column.key - second.request.column.key
    )
    .slice(0, MAX_COLUMNS_PER_FILE)
    .map(({ request }) => request);
}
