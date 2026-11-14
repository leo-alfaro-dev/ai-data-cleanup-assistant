# Development plan

How the AI Data Cleanup Assistant gets built: 12 epics, 44 tasks, one commit per epic. `CLAUDE.md` says how code is written in this repository; this folder says what gets built, in what order, and how each piece is proven.

## The brief

> Create an application that you can upload a csv into. With the csv, the application should use AI to read through the data and identify duplicates, inconsistent values, missing data, or suspicious records. Then the application should suggest edits, and allow the user to review/accept these edits.

The submission is a public repository with a descriptive README, a five-minute demo video and the entry form.

| The brief asks for                              | Delivered by                       |
| ----------------------------------------------- | ---------------------------------- |
| Upload a CSV                                    | T1.1, T1.3                         |
| AI reads through the data                       | Epic 6                             |
| Identify duplicates                             | T4.1, T4.5, T6.4                   |
| Identify inconsistent values                    | T4.2, T6.2                         |
| Identify missing data                           | T4.3, T6.2                         |
| Identify suspicious records                     | T4.4, T6.5                         |
| Suggest edits                                   | T2.3, then every check and AI task |
| Review and accept the edits                     | T5.3, T5.4, Epic 8                 |
| README that explains the code and how to run it | T11.1                              |
| Five-minute demo video                          | T11.2                              |

## What sets it apart

1. **Rules, not edits.** The model never rewrites the file. It proposes rules ("these 14 spellings are one state"); code validates them against what was actually sent, then applies them. Every change is explainable, reversible and repeatable. _T2.3, Epic 6_
2. **A recipe.** Accepted rules export as a file that cleans next month's export in one step, with no AI call. _Epic 9_
3. **Measured accuracy.** Errors are planted in synthetic data and recorded, so what the app finds can be scored per category and per model, with cost and latency. The measuring stick is built before the checks it measures. _Epic 3, Epic 10_
4. **Review at volume.** One decision covers a rule across every row it touches. Bulk accept, full keyboard control, edit before accepting, undo for everything. _Epic 5, Epic 8_
5. **Nothing hidden.** A panel shows exactly what was sent to the AI and what it cost. Small files are read in full, large ones as summaries. _T6.6_
6. **A demo that survives visitors.** Sample data one click away, a spend cap, rate limits, and the option to use your own key. _Epic 7_
7. **Visible process.** This plan, `CLAUDE.md`, CI, and one commit per epic. _Epic 0_

## Epics

| #   | Epic                                                  | When it is done                                                                                           | Tasks |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----- |
| 0   | [Foundation](epic-00-foundation.md)                   | Green checks from a fresh clone, and a public URL that redeploys on push                                  | 4     |
| 1   | [A CSV becomes data](epic-01-csv-becomes-data.md)     | Drop a CSV and see its facts, parsed off the main thread, proven on the production build                  | 3     |
| 2   | [Understand the data](epic-02-understand-the-data.md) | The engine describes every column and expresses any cleanup as data: previewed, applied, undone, exported | 4     |
| 3   | [Measuring stick](epic-03-measuring-stick.md)         | Synthetic data with planted, recorded errors, and a scorer for what the app finds                         | 2     |
| 4   | [Checks](epic-04-checks.md)                           | Code finds all four categories across the whole file, and every check has a score                         | 5     |
| 5   | [Review workspace](epic-05-review-workspace.md)       | A complete product without AI: grid, issues, decisions, cleaned view, export                              | 5     |
| 6   | [AI proposes rules](epic-06-ai.md)                    | The model reads summaries and proposes rules; code validates and applies them; every call is visible      | 7     |
| 7   | [Safe live demo](epic-07-live-demo.md)                | A public URL with sample data that one visitor cannot drain                                               | 4     |
| 8   | [Review at volume](epic-08-review-at-volume.md)       | Dozens of issues cleared in seconds, from the keyboard, with undo                                         | 3     |
| 9   | [Recipe](epic-09-recipe.md)                           | Next month's file cleaned in one step with no AI                                                          | 2     |
| 10  | [Proof](epic-10-proof.md)                             | A table: what each model finds, what it costs, how long it takes                                          | 2     |
| 11  | [Story](epic-11-story.md)                             | README, demo script, final QA, submission                                                                 | 3     |

Ideas that are out of the plan unless time is left over: [stretch.md](stretch.md).

## Checkpoints

The order is chosen so the app can be submitted at every checkpoint from B on.

| Checkpoint          | After      | What exists                                                |
| ------------------- | ---------- | ---------------------------------------------------------- |
| A. Works without AI | Epic 5     | Load, review, accept, export; every category found by code |
| B. Brief met        | Epic 6     | AI in all four categories, with full transparency          |
| C. Safe to share    | Epic 7     | Live demo with sample data and limits                      |
| D. Stands out       | Epics 8–10 | Review at volume, recipe, model benchmark                  |
| E. Submitted        | Epic 11    | README, video script, QA                                   |

## If time runs short

Epic 11 is never cut: without a README and a video there is no submission. Cut in this order, and stop cutting as soon as the time fits:

1. Everything in `stretch.md`.
2. Epic 10. The checks-only baseline from Epic 3 still gives the README a real number.
3. T8.3 (edit before accepting).
4. The rest of Epic 8.
5. Epic 9.

The shortest route to a real submission is checkpoint C, then Epic 11.

## How an epic runs

1. Read `CLAUDE.md`, this file and the epic's file.
2. Build the epic's tasks in order, each once its **After** tasks are done, one at a time and without pausing between them.
3. Build only what each task lists. If one turns out bigger than planned, stop and propose a split here instead of widening it.
4. Prove each task: its **Done when**, then `yarn verify`, and `yarn integrations` when it touches the UI, the worker or a route.
5. Tick each task in the status list below and apply its **Also update** line.
6. When the epic is done, report what changed, what was verified, and the commit message: the subject `Epic N: <name>` and the task titles in the body. Claude never commits or stages; the user commits once per epic.

Every task is done only when:

- its **Done when** list holds;
- `yarn verify` passes, and `yarn integrations` passes when the UI, the worker or a route changed;
- new behavior has specs beside the code, and no spec touches the network;
- UI changes are screenshotted at 1440px, 1280px and 390px;
- nothing outside the task's scope changed, and `CLAUDE.md` still describes the code.

In this folder, "task" means a numbered unit of work. A request to a model is always called an "AI task".

## Decisions the plan relies on

| #   | Decision                                                                                                                                                                                                   | Lands in   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1  | **Every change is a pure function of the original data.** Accepted changes never feed each other, so the result does not depend on the order of decisions, undo is free, and a recipe replays identically. | T2.3       |
| D2  | **The cleaned value is derived when it is read.** No cleaned copy of the data exists; a decision only recompiles a small plan.                                                                             | T2.3, T5.3 |
| D3  | **Precedence is explicit** when two accepted changes touch one cell: an explicit cell value, then date format, then value mapping, then whitespace trim. A removed row stays removed.                      | T2.3       |
| D4  | **Rows stream to the page in chunks of 10,000**, pulled from the worker, which keeps the working copy. The first screen appears while the rest arrive.                                                     | T1.3, T5.1 |
| D5  | **Issues are data, not sentences.** Checks return structured details and the UI words them. The model's reason is the only free text.                                                                      | T2.3, T5.2 |
| D6  | **AI requests are built in the worker**, from the profile and the check results, capped by each AI task's contract. The page only forwards them.                                                           | T6.2, T6.3 |
| D7  | **Small files are read in full.** When a file is smaller than a cap, every row and value is sent; summaries start only where size demands them.                                                            | T6.2, T6.5 |
| D8  | **An AI issue absorbs a check issue it contains**, so the same values never get two competing suggestions. A check issue that is already decided is never absorbed.                                        | T6.3       |
| D9  | **Scoring is per item**: a cell for value errors, a row for duplicates, per category, against the planted truth. The checks-only baseline costs nothing and is committed.                                  | T3.2       |
| D10 | **Test data is synthetic**: names from small pools, emails on reserved domains (`example.com`), phones in the fictional `555-01xx` range.                                                                  | T3.1       |

## Risks, and where the plan retires them

| Risk                                                                                  | Retired by                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The Web Worker starts in development but hangs silently in production                 | T1.3: e2e runs on the production build, so the first worker commit proves it                     |
| Vercel with Yarn 4, Node 24 and Next.js 16.4                                          | T0.4: the shell is deployed before any feature depends on hosting                                |
| OpenRouter's structured output, cost fields or error statuses differ from assumptions | T6.1 starts by reading the live docs; Zod validates every reply whatever the provider promises   |
| The `openai` SDK changed in its latest major                                          | T6.1 reads the installed types before any call is written                                        |
| The model invents values or cites rows it never saw                                   | Reference validation in every AI task (T6.2, T6.4, T6.5), measured in T10.1                      |
| 100,000 rows freeze the page                                                          | D2 and D4, and T5.1 is not done until a 100,000 × 20 file scrolls                                |
| A reviewer tries a tiny, odd file of their own: 15 rows, semicolons, Excel encoding   | T1.1 (delimiters, encodings), D7 (small files read in full), T6.5 and T11.3 test hand-made files |
| One visitor drains the demo budget                                                    | T7.1 (rate limit), T7.2 (own key), T7.3 (spend cap)                                              |
| The day runs out                                                                      | Checkpoints and the cut order above                                                              |

## What needs you

- **A commit after every epic.** The subject is `Epic N: <name>`; the body lists the task titles.
- **T0.4 and T7.3:** push to GitHub, create the Vercel project, add the production key.
- **Before Epic 6:** a development OpenRouter key in `.env.local`. Each real call is announced before it is made.
- **T7.3:** a production key with a credit limit, set in Vercel.
- **T10.1:** approval of the benchmark's estimated spend, which is printed before any call.
- **T11.2 and T11.3:** recording the video and sending the form.

## Status

### Epic 0 — Foundation

- [x] **T0.1** Scaffold the Next.js app with tests, lint and pre-commit checks
- [x] **T0.2** Add CI workflow running the checks and e2e on push
- [x] **T0.3** Add the development plan and update CLAUDE.md
- [x] **T0.4** Deploy the walking skeleton to Vercel · _needs you_

### Epic 1 — A CSV becomes data

- [x] **T1.1** Parse CSV files into an immutable dataset
- [x] **T1.2** Add Button and ProgressBar primitives
- [x] **T1.3** Load a CSV in a Web Worker and show its facts

### Epic 2 — Understand the data

- [ ] **T2.1** Add value helpers for blanks, comparison, numbers, dates and types
- [ ] **T2.2** Profile each column: types, distinct values and numeric spread
- [ ] **T2.3** Model issues and changes, and derive cleaned cells
- [ ] **T2.4** Export the cleaned CSV and a change log from the engine

### Epic 3 — Measuring stick

- [ ] **T3.1** Generate synthetic customer data with planted, recorded errors
- [ ] **T3.2** Score found issues against planted errors

### Epic 4 — Checks

- [ ] **T4.1** Find exact and normalized duplicate rows
- [ ] **T4.2** Find whitespace, casing, date-format and type inconsistencies
- [ ] **T4.3** Find empty cells and placeholder values
- [ ] **T4.4** Find outliers, invalid emails, formula-like cells and structural issues
- [ ] **T4.5** Find shared identifiers and near-duplicate candidates

### Epic 5 — Review workspace

- [ ] **T5.1** Show the data in a virtualized grid
- [ ] **T5.2** Run the checks in the worker and list issues by category
- [ ] **T5.3** Accept or reject suggestions and show the cleaned data
- [ ] **T5.4** Inspect an issue: examples, affected rows and grid focus
- [ ] **T5.5** Download the cleaned CSV and the change log

### Epic 6 — AI proposes rules

- [ ] **T6.1** Add the OpenRouter gateway with validated structured output
- [ ] **T6.2** Add the normalize-values AI task
- [ ] **T6.3** Run AI tasks from the browser with progress, abort and retry
- [ ] **T6.4** Add the confirm-duplicates AI task
- [ ] **T6.5** Add the assess-suspicious-rows AI task
- [ ] **T6.6** Show what was sent to the AI and what it cost
- [ ] **T6.7** Choose the model for a run

### Epic 7 — Safe live demo

- [ ] **T7.1** Rate-limit hosted-key calls and explain limit and budget failures
- [ ] **T7.2** Let visitors use their own OpenRouter key
- [ ] **T7.3** Set up the production key and spend cap, and link the live demo · _needs you_
- [ ] **T7.4** Design the first screen: sample data, privacy facts and metadata

### Epic 8 — Review at volume

- [ ] **T8.1** Decide in bulk and undo any step
- [ ] **T8.2** Review from the keyboard
- [ ] **T8.3** Edit a suggestion before accepting it

### Epic 9 — Recipe

- [ ] **T9.1** Export accepted rules as a recipe
- [ ] **T9.2** Replay a recipe on another file without AI

### Epic 10 — Proof

- [ ] **T10.1** Benchmark models on planted errors: accuracy, cost and latency · _needs your approval of the spend_
- [ ] **T10.2** Choose the default model and limits from the benchmark

### Epic 11 — Story

- [ ] **T11.1** Write the README
- [ ] **T11.2** Add the five-minute demo script
- [ ] **T11.3** Run the final QA pass and complete the submission checklist
