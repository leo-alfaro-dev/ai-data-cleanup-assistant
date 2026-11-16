# Epic 5: Review workspace

**Outcome:** a complete product without AI. Load a file, see every row, review issues grouped by category, accept or reject, watch the cleaned data change, export. This is checkpoint A.

**Why it matters:** the brief ends with "allow the user to review/accept these edits", and this is the screen a reviewer spends their time on. Building it on the checks alone means the review loop is finished and tested before any model is involved, and the app keeps working when a model is not available.

**Show after this epic:** load the sample, accept the whitespace issue, see the cells change in the grid, download the cleaned file.

**Layout**, desktop first:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AI Data Cleanup Assistant   customers.csv · 1,150 rows · 11 columns  [Export] │
├─────────────────────────────┬────────────────────────────────────────────────┤
│ Duplicates 3  Inconsistent 6 │ Issue detail: what changes, why, before → after │
│ Missing 4     Suspicious 5   │                                                │
│ ─────────────────────────── ├────────────────────────────────────────────────┤
│ ▸ issue card                 │ Data grid                [Original | Cleaned] │
│ ▸ issue card                 │   1  customer_id  first_name  email   …        │
│ ▸ issue card                 │   2  …                                         │
└─────────────────────────────┴────────────────────────────────────────────────┘
```

Below the `lg` breakpoint the two columns become two tabs, Issues and Data. Both stay mounted and the inactive one is `hidden`, so neither loses its scroll position and both keep following the stores.

## T5.1: Show the data in a virtualized grid

**After:** T1.3

**Build**

- `src/components/VisibleValue.tsx`: renders a cell value with leading and trailing spaces, non-breaking spaces and tabs made visible, and an empty value shown as a muted mark.
- `src/features/workspace/components/grid/`: `DataGrid` (rows and columns virtualized with `@tanstack/react-virtual`), `DataGridHeader`, `DataGridRow`, `DataGridCell`, `DataGridRowSkeleton`.
- `useRow(rowId)`: a slice hook over `rowChunks`.

**Decisions**

- Spreadsheet row numbers in a sticky first column, and a sticky header.
- Fixed row height. Column widths come from the header and a sample of values, clamped to a minimum and a maximum.
- A row whose chunk has not arrived renders the skeleton (D4).
- Inline `style` is used only for the virtualizer's offsets and the column widths.

**Done when**

- Component spec for `VisibleValue`: a leading space, a non-breaking space, an empty value.
- e2e: the fixture's rows are visible; scrolling to the end shows the last row with the right row number.
- A 100,000 × 20 file, generated into a scratch folder and not committed, loads and scrolls without freezing. Load time and scroll behavior are stated in the report.
- No page-level horizontal scroll at 390px. Screenshots at the three widths.

## T5.2: Run the checks in the worker and list issues by category

**After:** T4.1 to T4.5, T5.1

**Build**

- Worker: `analyze()`. Profiles the data, then runs each check with a pause, a progress report and a cancel test between checks. Returns the issues, the near-duplicate candidates and the profile.
- Store: `issues`, `profile`, the analysis status; `reviewStore` with the selected issue and the category filter.
- `src/features/workspace/issueCopy.ts`: `describeIssue(issue)` gives a title and a summary for each kind of `details`.
- `src/features/workspace/issueCategories.ts`: `Record<IssueCategory, { label; icon }>`, read everywhere a category is shown.
- `src/components/Badge.tsx`, and in the feature: `CategoryBadge`, `CategorySummary` (four counts that also filter), `IssueList`, `IssueCard` (category, title, rows affected, source, confidence), `IssueListSkeleton`.
- The two-column layout above, and its two-tab form on narrow screens.

**Decisions**

- Analysis starts as soon as the file is loaded, while the row chunks are still arriving.
- The list is ordered by category, then by rows affected, and is virtualized: a messy 100,000-row file gives thousands of issues, one per record for shared identifiers.
- D5: titles are built from structured details. The four labels are the brief's words.
- Numeric columns in the grid align right, with `tabular-nums`, once the profile arrives.

**Done when**

- Store spec: issues land; progress is reported; loading a new file cancels the analysis in flight.
- Component spec: the counts per category are right; the filter narrows the list; absence is asserted only after presence.
- e2e on the sample: all four categories show a count above zero.
- Screenshots at the three widths.

## T5.3: Accept or reject suggestions and show the cleaned data

**After:** T5.2, T2.3

**Build**

- Store: `decisions`, a map keyed by `IssueId`; actions `accept`, `reject`, `resetDecision`.
- `useCleanPlan`: a selector that compiles the accepted changes.
- Grid: cleaned values with a mark on changed cells; removed rows struck through; an Original / Cleaned toggle.
- `IssueCard` actions: Accept, Reject, Undo. An issue without a suggestion offers Dismiss.
- `ReviewProgress`: decided out of total.

**Decisions**

- D2: a decision changes one map entry and recompiles the plan. Rows are never copied.
- Undo is `resetDecision`. A full history arrives in T8.1.
- Dismissing an issue that has no suggestion is stored as a rejection.

**Done when**

- Store spec: accepting changes the cleaned cell; resetting restores the original; two accepted rules on one cell follow D3.
- Component spec: accepting updates the card and the progress.
- e2e: accept the whitespace issue on the sample; a known cell shows its cleaned value; the toggle shows the original again.
- Screenshots at the three widths.

## T5.4: Inspect an issue: examples, affected rows and grid focus

**After:** T5.3

**Build**

- `IssueDetail`: what changes and why, counts, and before → after examples rendered with `VisibleValue`.
- `AffectedRows`: a virtualized list of the issue's rows; choosing one jumps the grid to it.
- `DuplicateGroup`: the rows of a group side by side, with only the differing cells marked.
- Grid: the cells of the selected issue highlighted in its category color; a filter for "only rows in this issue".

**Decisions**

- Selecting an issue highlights its cells but does not move the grid. The grid moves only when the user asks, so a reviewer scanning the list never loses their place.
- Category color always comes with the category's label or icon.

**Done when**

- Component spec: example pairs show invisible differences; a duplicate group marks only the cells that differ.
- e2e: select an issue, jump to a row, and that row is visible and highlighted.
- Screenshots at the three widths.

## T5.5: Download the cleaned CSV and the change log

**After:** T5.3, T2.4

**Build**

- Worker: `exportFiles(accepted)` returns the CSV text and the change log.
- `src/components/Modal.tsx` on Radix Dialog, with `isCloseDisabled`.
- `ExportDialog`: cells changed, rows removed, issues still pending, and two downloads.
- `src/features/workspace/downloadFile.ts`: text to a browser download.
- The Export button in the header.

**Decisions**

- Files are named `<name>.cleaned.csv` and `<name>.changes.csv`.
- Exporting with issues still pending is allowed, and the dialog says how many are pending.
- The export runs in the worker, so a large file does not freeze the page, and the dialog cannot be closed while it runs.

**Done when**

- Component spec: while an export is held open, the dialog cannot be dismissed and no control in it is enabled.
- e2e: accept one issue and export; the downloaded CSV holds the cleaned value and the log lists the row. With no decisions, the downloaded rows equal the input rows.
- Screenshots at the three widths.

**Checkpoint A:** the app works end to end without AI.
