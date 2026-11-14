# Epic 11 — Story

**Outcome:** a reviewer understands in two minutes what this is, why it is built this way and that it works. The video shows it in five.

**Why it matters:** the README and the video are what gets judged. Most reviewers will not clone the repository; they will read the first screen of the README and watch the video. Everything built before this epic only counts if these two make it visible. This epic is never cut.

## T11.1 — Write the README

**After:** checkpoint B at least

**Sections, in this order**

1. One paragraph on what it is, the live demo link, and a screenshot or short recording.
2. The brief, and how each line of it is met, as a table.
3. How it works: a diagram of file → worker → checks → summaries → AI → rules → decisions → export.
4. What is different: rules instead of edits, the recipe, measured accuracy, review at volume, transparency.
5. The accuracy table, with the checks-only row.
6. Privacy and limits: what leaves the browser, what the demo caps.
7. Run it locally, with and without a key.
8. Tests and CI.
9. Project structure.
10. Decisions and trade-offs, including what was deliberately not built and why.
11. What comes next: the production shape for large files and teams (a queue and workers, object storage for uploads, a database for recipes and audit trails), and the items in `stretch.md`.
12. How AI was used to build it: `CLAUDE.md`, this plan, and one commit per epic.

**Decisions**

- Every claim links to code or to a results file. No number appears that a file in the repository cannot back.
- Short sentences, no hype. The first screen must be enough for a reviewer who reads nothing else.
- Images live in `docs/`.

**Done when**

- The commands work when copied into a fresh clone, verified in a temporary clone.
- Every link resolves.
- `yarn verify` passes, spellcheck included.

## T11.2 — Add the five-minute demo script

**After:** T11.1

**Build:** `docs/demo-script.md`, with the exact clicks and the lines to say.

| Time | What is shown                                                                                |
| ---- | -------------------------------------------------------------------------------------------- |
| 0:00 | The problem, and the promise: nothing changes without your decision                          |
| 0:30 | Load the sample. Check issues appear at once, in the brief's four categories                 |
| 1:15 | AI issues arrive. Open the panel: what was sent, what it cost                                |
| 2:00 | Review from the keyboard, bulk accept, edit one suggestion, undo                             |
| 2:45 | Export, then replay the recipe on next month's file with zero AI calls                       |
| 3:30 | How it is built: rules instead of edits, the worker, validation of everything the model says |
| 4:10 | The accuracy table, and how the default model was chosen                                     |
| 4:35 | What it took: the plan, one commit per epic, CI. What comes next                             |

**Decisions**

- The script follows decisions, not a tour of features: each section answers "why is it built this way".
- A fallback is written in for a slow live call: a second tab with the run already finished.

**Done when**

- A dry run of the clicks fits in five minutes, timed by you.

## T11.3 — Run the final QA pass and complete the submission checklist

**After:** T11.2

**Build:** `docs/submission-checklist.md`. Each defect found during the pass is fixed within this epic and listed in the checklist.

**The pass**

- Three widths: 1440px, 1280px, 390px.
- The whole flow with the keyboard only; focus always visible; controls labeled for assistive technology.
- Failure paths: a file that is not a CSV, an empty file, no key, a wrong own key, rate limited, budget exhausted.
- Odd files: a hand-made file of 15 rows, a semicolon-delimited file, an Excel-encoded file, a file with ragged rows, a 100,000-row file.
- Chrome, Safari and Firefox.
- A fresh clone runs with the README's commands.
- CI is green and a live demo run succeeds.

**The submission**

- The repository is public and the README's links work.
- The video is recorded and uploaded.
- The form is sent.

**Done when**

- Every line is ticked, or waived on purpose with its reason written next to it.

**Checkpoint E:** submitted.
