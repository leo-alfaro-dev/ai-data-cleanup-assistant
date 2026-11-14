# Epic 4 — Checks

**Outcome:** code finds all four categories across the whole file, with no AI involved, and every check has a score against the planted errors.

**Why it matters:** checks are exact, free and instant, and they run on every row, which no model can afford to do on a large file. They are also what makes the AI affordable: they shrink the file to the values, pairs and rows worth a model's attention.

**Show after this epic:** the checks-only table, with real precision and recall per category.

**Every task in this epic**

- One file per check in `src/engine/checks/`, registered in `checks.ts`. A check is a pure function of the dataset and the profile.
- A spec from both sides, fed by a small inline CSV: what the check must find, and what it must leave alone.
- Each issue carries its rows, its `details`, and a `suggestion` or `null`. A check never invents a value.
- Each task ends by running `yarn eval --checks-only`, updating `eval/results/checks-only.json`, and reporting the table.

## T4.1 — Find exact and normalized duplicate rows

**After:** T3.2

**Build**

- `findExactDuplicates.ts`: rows equal cell by cell. One issue, `certain`, suggesting `dropDuplicateRows` in exact mode.
- `findNormalizedDuplicates.ts`: rows equal by `toComparisonKey` on every cell, but not exact. One issue, `high`, suggesting `dropDuplicateRows` in normalized mode.

**Decisions**

- One issue per check, covering all its groups: one decision removes every copy, and the groups are the detail to inspect.
- The first row of each group is kept.
- Rows that are entirely blank are left to the structure check in T4.4.

**Done when**

- Specs: two identical rows are found; rows that differ by one character are not; rows that differ only by case or spacing are found by the normalized check and not by the exact one; three copies form one group that keeps the first.
- The duplicates row of the baseline shows the exact copies found.

## T4.2 — Find whitespace, casing, date-format and type inconsistencies

**After:** T3.2

**Build**

- `findWhitespaceIssues.ts`: per column, values that `normalizeWhitespace` changes. `certain`, suggesting `trimWhitespace`.
- `findCasingVariants.ts`: in categorical columns, values that share a comparison key but are spelled differently. `high`, suggesting `mapValues` to the most frequent spelling.
- `findMixedDateFormats.ts`: date columns with more than one format. `high`, suggesting `standardizeDates` to the column's dominant format.
- `findTypeMismatches.ts`: in columns with a dominant type, values of another type that are not placeholders. `medium`, no suggestion.

**Decisions**

- The casing check skips identifier-like and free-text columns: names are not categories.
- On a tie, the canonical spelling is the one seen first.
- Dates are standardized to the format the column already mostly uses, not to a fixed one. Ambiguous dates are listed in the issue and left untouched.
- A type mismatch is only reported. Whether `twelve` in a number column should become `12` is a judgment for the user or the model.

**Done when**

- Specs from both sides for each check. Among them: an ambiguous date stays untouched and is listed; a column of names produces no casing issue; `N/A` in a number column is not a type mismatch, because T4.3 owns it.
- The inconsistent-values row of the baseline is filled.

## T4.3 — Find empty cells and placeholder values

**After:** T3.2

**Build**

- `findEmptyCells.ts`: per column with blanks, one issue with its rows. `certain`, no suggestion: nothing is invented.
- `findPlaceholders.ts`: values whose comparison key is in the common list (`n/a`, `na`, `null`, `none`, `nil`, `-`, `--`, `?`, `unknown`, `tbd`, `missing`). `high`, suggesting `mapValues` to empty.

**Decisions**

- When a placeholder makes up more than 20% of a column, confidence drops to `medium`: it may be a real category, such as a plan called `none`.
- The list is one named constant. Placeholders specific to a file are the model's job in T6.2.

**Done when**

- Specs from both sides: `N/A` is found and `Nancy` is not; `-` is found and `-5` is not; `none` filling a third of a plan column is found with `medium` confidence; the empty-cells issue has no suggestion.
- The missing-data row of the baseline is filled.

## T4.4 — Find outliers, invalid emails, formula-like cells and structural issues

**After:** T3.2

**Build**

- `src/engine/values/editDistance.ts`.
- `findNumericOutliers.ts`: in numeric columns, values whose robust score (from the median and the median absolute deviation) passes `OUTLIER_THRESHOLD`, and negative values in a column that is otherwise positive. `medium`, no suggestion.
- `findInvalidEmails.ts`: in email columns, values that fail the pattern. No suggestion, except when the domain is one edit away from a domain that covers at least 20% of the column: then `setCells` with the corrected domain, `high`.
- `findFormulaLikeValues.ts`: values that start with `=`, `+`, `-` or `@` and are not numbers or phone numbers. `high`, no suggestion.
- `findStructuralIssues.ts`: ragged rows, empty or repeated headers, and fully blank rows, from `StructureNotes`. `certain`, no suggestion.

**Decisions**

- Outliers need at least 30 numeric values and a deviation above zero; otherwise the check stays silent instead of guessing.
- The email typo rule is learned from the column itself, not from a list of providers, so it works on any company's domain.
- These are flags. Except for the email domain, deciding the right value is left to the user or to the model in T6.5.

**Done when**

- Specs from both sides: a column of 1 to 100 with one 10,000 is flagged, and a column that is naturally wide is not; `jo@exmaple.com` gets `jo@example.com` when `example.com` dominates, and no suggestion when domains are varied; `=SUM(A1)` is flagged, `-12.5` and `+1 555 0100` are not.
- The suspicious-records row of the baseline is filled.

## T4.5 — Find shared identifiers and near-duplicate candidates

**After:** T4.1

**Build**

- `src/engine/values/jaroWinkler.ts`.
- `findSharedIdentifiers.ts`: rows that share a value in an identifier-like column (the same email, or the same phone digits) and are not duplicates by T4.1. `high`, suggesting `mergeRows`: keep the first row and fill its blanks from the other.
- `findNearDuplicateCandidates.ts`: pairs worth a second opinion, each with a similarity and its evidence. These are not issues; they wait for the model in T6.4.

**How candidates are found**

1. Rows that share a comparison key in an identifier-like column.
2. For the two most name-like text columns: sort by comparison key, compare each row with its next five neighbors, and keep pairs whose combined name scores at least 0.92 and that agree on at least one other column.
3. Keep the strongest `MAX_CANDIDATE_PAIRS` (300).

**Decisions**

- A merge only chooses between the two rows' values. It never writes a value neither row had.
- Comparing neighbors in sorted order keeps the work proportional to the number of rows, not to its square.

**Done when**

- Specs: the same email under different name casing gives a shared-identifier issue; `Jon Smith` and `John Smith` in the same city give a candidate and no issue; unrelated rows give nothing; the cap keeps the strongest pairs; the number of comparisons for 100,000 rows stays within rows × window.
- The duplicates row of the baseline now includes the near copies that share an identifier.
