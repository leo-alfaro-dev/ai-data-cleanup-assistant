# Epic 3 — Measuring stick

**Outcome:** a synthetic dataset in which every error is planted and recorded, and a scorer that says what share of them the app finds.

**Why it matters:** "it seems to work" is not evidence. This epic is built before the checks on purpose, so every check and every AI task lands with a number, and recall can be seen rising task by task. The same generator produces the demo's sample file, so the demo runs on data whose answers are known.

**Show after this epic:** `yarn eval --checks-only` printing a table of zeros that Epic 4 will fill.

## T3.1 — Generate synthetic customer data with planted, recorded errors

**After:** T2.3

**Build** (`eval/`)

- `eval/generate/createRandom.ts`: a seeded random generator.
- `eval/generate/generateCustomers.ts`: clean rows with `customer_id`, `first_name`, `last_name`, `email`, `phone`, `city`, `state`, `country`, `signup_date`, `plan`, `monthly_spend`.
- `eval/corrupt/truth.ts`: the `PlantedError` union: category, kind, rows, column, clean value, corrupted value.
- `eval/corrupt/corruptDataset.ts`: applies seeded corruptions; returns the dirty rows and the truth.
- `eval/buildDatasets.ts` and the script `yarn eval:data`, which writes `eval/datasets/customers.csv`, `eval/datasets/customers.truth.json` and `public/samples/customers.csv`.
- Vitest's Node project also includes `eval/**/*.spec.ts`.

**Planted errors**, with their rates as named constants:

| Category            | What is planted                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Duplicates          | Exact copies; near copies with a name typo, different casing, a reformatted phone or a blanked field                |
| Inconsistent values | One state written several ways (`CA`, `Calif.`, `California`, `ca`); casing and spacing noise; a second date format |
| Missing data        | Blanks; placeholders (`N/A`, `-`, `unknown`, `TBD`)                                                                 |
| Suspicious records  | Spend multiplied by 100 or negative; emails without `@` or with a domain one letter off; one formula-like value     |

**Decisions**

- D10: everything is synthetic. Names come from small pools, emails use the reserved domains `example.com`, `example.org` and `example.net`, phones use the fictional `555-01xx` range. No value can belong to a real person.
- 1,000 clean rows become about 1,150 after corruption: large enough to be convincing, small enough that a demo run costs cents.
- The same seed always produces the same bytes.
- A cell never carries two planted errors, so the truth stays unambiguous. Value errors land only on rows outside duplicate pairs, at most one per row.
- An exact copy repeats every cell. A near copy is a record entered again: a new `customer_id` and exactly one other change. Every copy lands after its original, because the app keeps the first row of a group.
- `committedDatasets.spec.ts` fails when the generator changes and `yarn eval:data` was not rerun.

**Done when**

- Specs: the same seed gives identical output and a different seed does not; every planted error matches the dirty data (the cell holds the corrupted value and the truth holds the clean one); no cell carries two errors.
- `yarn eval:data` writes the three files, and they are committed.

**Also update:** `CLAUDE.md` commands gain `yarn eval:data`; the Testing section notes that eval code has specs too.

## T3.2 — Score found issues against planted errors

**After:** T3.1, T2.2

**Build**

- `src/engine/checks/check.ts`: the one signature every check shares, with its id and category.
- `src/engine/checks/checks.ts`: the registered list, empty for now.
- `src/engine/checks/runChecks.ts`: dataset and profile to issues.
- `Issue` gains `column`: the column whose cells the issue covers in its rows, or `null` for whole rows. The scorer, the grid highlight (T5.4) and absorption (D8) read it.
- `src/engine/changes/listChangedCells.ts`, extracted from `previewChange`: the cells a change rewrites, shared by the preview and the scorer.
- `eval/score/scoreIssues.ts`: issues and truth to precision, recall and suggestion accuracy per category.
- `eval/run.ts` and the script `yarn eval`. With `--checks-only` it parses, profiles, runs the checks, scores, prints a table and writes `eval/results/checks-only.json`.

**Scoring rules** (D9)

- The unit is an item: a cell for value errors, a row for duplicates. Both rows of a planted pair are duplicate items.
- An issue claims its column's cells in its rows, or its whole rows when it has no column; each item counts once however many issues claim it. A planted item counts as found when a claim of the same category covers it.
- Precision is correct claims over claims. Recall is found planted items over planted items. A ratio over nothing is empty, never zero.
- A copied row is one duplicate error: value claims and suggested cells inside it are not scored.
- Suggestion accuracy is the share of suggested cell values that equal the clean value, each suggestion scored alone. For missing data an empty value is also right, because no value is invented. For duplicates it is the share of removals that remove the planted copy.

**Decisions**

- `--checks-only` needs no key and costs nothing. Runs against real models come in T10.1 and use the same scorer.
- Result files are committed. Each task in Epic 4 updates the baseline alongside its code.

**Done when**

- Specs with small hand-built truth: a perfect match scores 1.0 and 1.0; a false alarm lowers precision only; a miss lowers recall only; the right cell in the wrong category does not count.
- `yarn eval --checks-only` runs and writes the results file, all zeros until Epic 4.

**Also update:** `CLAUDE.md` commands: `yarn eval --checks-only` is free and safe to run; `yarn eval` against models costs money and needs the user's approval.
