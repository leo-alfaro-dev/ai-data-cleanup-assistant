import type { Check } from './check';
import { findCasingVariants } from './findCasingVariants';
import { findEmptyCells } from './findEmptyCells';
import { findExactDuplicates } from './findExactDuplicates';
import { findFormulaLikeValues } from './findFormulaLikeValues';
import { findInvalidEmails } from './findInvalidEmails';
import { findMixedDateFormats } from './findMixedDateFormats';
import { findNormalizedDuplicates } from './findNormalizedDuplicates';
import { findNumericOutliers } from './findNumericOutliers';
import { findPlaceholders } from './findPlaceholders';
import { findSharedIdentifiers } from './findSharedIdentifiers';
import { findStructuralIssues } from './findStructuralIssues';
import { findTypeMismatches } from './findTypeMismatches';
import { findWhitespaceIssues } from './findWhitespaceIssues';

export const CHECKS: readonly Check[] = [
  findExactDuplicates,
  findNormalizedDuplicates,
  findSharedIdentifiers,
  findCasingVariants,
  findMixedDateFormats,
  findTypeMismatches,
  findWhitespaceIssues,
  findEmptyCells,
  findPlaceholders,
  findFormulaLikeValues,
  findInvalidEmails,
  findNumericOutliers,
  findStructuralIssues,
];
