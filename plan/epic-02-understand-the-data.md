# Epic 2 — Understand the data

**Outcome:** the engine can describe every column, and can express any cleanup as data: a change that is previewed, applied, undone and exported. All of it is pure TypeScript with specs.

**Why it matters:** this is where "rules, not edits" becomes real. Once a change is a small piece of data and the cleaned value is derived from it, review, undo, export, recipes and scoring all become simple consequences instead of separate features.

**Show after this epic:** nothing on screen yet. The proof is the spec list: order-independent changes, a frozen original, and a round trip that reproduces the input.

## T2.1 — Add value helpers for blanks, comparison, numbers, dates and types

**After:** T1.1

**Build** (`src/engine/values/`, one helper per file, spec beside each)

- `isBlank`: empty or whitespace only, non-breaking spaces included.
- `normalizeWhitespace`: trims, collapses inner runs, and turns non-breaking spaces and tabs into spaces.
- `toComparisonKey`: `normalizeWhitespace`, then Unicode NFKC, then lower case. This is what "the same value written differently" means everywhere in the engine.
- `parseNumber`: plain numbers, thousands separators, a currency symbol, a percent sign, a leading minus. Returns a number or `null`.
- `parseDate`: recognizes `2024-03-04`, `2024/03/04`, `03/04/2024`, `Mar 4, 2024` and `4 Mar 2024`. Returns the format, the parts and `isAmbiguous`; returns `null` for a date that does not exist.
- `detectValueType`: `empty`, `integer`, `decimal`, `boolean`, `date`, `email`, `phone`, `url` or `text`.

**Decisions**

- No date library. The supported formats are the list above, stated at the top of `parseDate`.
- Ambiguity is data. `03/04/2024` is reported as ambiguous and never resolved here.
- Every later check asks these helpers; none re-implements them inline.

**Done when**

- Each helper has a spec from both sides: what it accepts and what it must leave alone. Among them: `1,234.50` is a number and `12-34` is not; `02/30/2024` is not a date; `03/04/2024` is ambiguous and `13/04/2024` is not; `"  a  b "` and `"a b"` share a comparison key; a non-breaking space counts as blank.

## T2.2 — Profile each column: types, distinct values and numeric spread

**After:** T2.1

**Build**

- `src/engine/profile/columnProfile.ts`: the `ColumnProfile` type.
- `src/engine/profile/profileColumn.ts` and `profileDataset.ts`.

A profile holds, per column: blank and non-blank counts; distinct values with counts, most frequent first, keyed by `normalizeWhitespace` so casing variants stay distinguishable; the share of each value type and the dominant type; a summary that depends on that type (minimum, maximum, median and median absolute deviation for numbers; format counts for dates); and two flags, `isCategorical` and `isIdentifierLike`.

**Decisions**

- A type is dominant when at least 80% of the non-blank values share it; otherwise the column is `mixed`.
- `isCategorical`: at most 200 distinct values, and no more than half as many distinct values as non-blank cells. `isIdentifierLike`: at least 95% distinct.
- Thresholds are named constants, each with a one-line reason at its definition.
- Distinct values are tracked up to 5,000 per column; beyond that the profile says it is truncated.
- The type-specific summary is a union discriminated by the dominant type, not a bag of optional fields.

**Done when**

- Specs: a numeric column with one extreme value (the median and deviation ignore it); a categorical column; an identifier column; a column with no dominant type; an all-blank column; truncation at the distinct limit.

## T2.3 — Model issues and changes, and derive cleaned cells

**After:** T2.1

**Build**

- `src/engine/issues/issue.ts`: `IssueId`, `IssueCategory` (`duplicate`, `inconsistent`, `missing`, `suspicious`), `IssueSource` (`check`, `ai`), `Confidence` (`certain`, `high`, `medium`, `low`) and `Issue`: the shared fields, `rows`, `suggestion: Change | null`, and `details`, a union by kind that grows with each check.
- `src/engine/changes/change.ts`: the `Change` union.
  - Rules, which are row-independent: `trimWhitespace`, `mapValues`, `standardizeDates`, `dropDuplicateRows`.
  - Row-specific changes: `setCells`, `mergeRows`, `removeRows`.
  - `isRule(change)`.
- `src/engine/changes/compileCleanPlan.ts`: accepted changes to a `CleanPlan` (rules per column, explicit cell values, removed rows), each entry remembering the issue it came from.
- `src/engine/changes/cleanCell.ts`: plan, row, column and original value to the cleaned value and the issue responsible.
- `src/engine/changes/previewChange.ts`: a change against the dataset to its counts (cells, rows, removed rows) and a capped list of before and after examples.

**Decisions**

- D1: every change is computed from the original data. `mapValues` matches on the `normalizeWhitespace` form of the original value, so trimming and mapping give the same result in either order.
- D2: there is no cleaned copy. A decision recompiles the plan, which costs time proportional to the accepted changes, not to the rows.
- D3: precedence on one cell is an explicit value, then date format, then value mapping, then whitespace trim. The first that changes the value wins. A removed row stays removed.
- `dropDuplicateRows` carries the groups found at analysis time and keeps the first row of each.
- D5: `details` is structured. Nothing in the engine produces an English sentence.

**Done when**

- Specs: each change kind alone; trim and map on one cell give the mapped value whichever is accepted first; an explicit cell value beats a rule; a removed row stays removed whatever else touches it; compiling without a change restores the original value; the dataset is deeply frozen in every spec and never mutated; `previewChange` returns the right counts and examples.

**Also update:** nothing. `CLAUDE.md` already states D1, D3 and D5.

## T2.4 — Export the cleaned CSV and a change log from the engine

**After:** T2.3

**Build**

- `src/engine/export/exportCsv.ts`: dataset and plan to CSV text, using the source's delimiter, line break and byte order mark.
- `src/engine/export/buildChangeLog.ts`: dataset and plan to entries of row number, column, before, after, change kind and issue.
- `src/engine/export/exportChangeLog.ts`: entries to CSV.

**Decisions**

- Export walks the rows once and asks `cleanCell` for each value, so the file and the screen can never disagree.
- Removed rows are absent from the file and present in the log as removals.
- Values are quoted only where the format requires it.
- A file decoded as Windows-1252 is exported as UTF-8, and the log says so.

**Done when**

- Round trip: parse, export with an empty plan, parse again, and the rows and headers are equal. Run for each delimiter, with and without a byte order mark, with both line breaks.
- With changes: every exported cell equals `cleanCell`; the log lists exactly the cells that differ, plus the removed rows.
- A value containing the delimiter, a quote or a line break survives the round trip.
