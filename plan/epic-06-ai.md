# Epic 6 — AI proposes rules

**Outcome:** the model reads compact summaries and proposes rules; code validates them against what was sent and turns them into suggestions; every call is visible with its cost. This is checkpoint B: the brief is fully met.

**Why it matters:** this is the part of the brief that says "use AI", and it is where most submissions will paste the file into a prompt. Three things are different here. The model sees summaries, so the app scales and stays cheap. The model returns rules, never a rewritten file, so nothing it says is applied without being validated. And everything it was sent is on screen.

**Show after this epic:** the sample's fourteen spellings of one state arrive as one AI suggestion a few seconds after the checks, next to the request that produced it and what it cost.

**Before starting, needs you:** a development OpenRouter key in `.env.local`. Each real call is announced before it is made.

**Every AI task in this epic** lives in `src/ai/tasks/<task>/` as five files:

| File                     | Runs in         | Does                                                              |
| ------------------------ | --------------- | ----------------------------------------------------------------- |
| `<task>Contract.ts`      | browser, server | Zod schemas for the request and the response, and the caps        |
| `build<Task>Requests.ts` | worker          | Profile and check results to capped requests (D6)                 |
| `build<Task>Prompt.ts`   | server          | A request to messages. Pure, with a snapshot spec                 |
| `run<Task>.ts`           | server          | Calls the model, validates the reply, drops and counts bad claims |
| `to<Task>Issues.ts`      | browser         | A validated reply to issues with suggestions                      |

Each also has a thin route at `/api/ai/<task-name>`, and one real call whose reply is saved under `e2e/fixtures/ai/` for the mocked e2e runs.

## T6.1 — Add the OpenRouter gateway with validated structured output

**After:** T0.1

**First:** read OpenRouter's docs for structured output, usage and cost accounting, and error statuses, and read the installed `openai` types. State what was found in the report, and adjust this task if reality differs from what is written here.

**Build** (`src/ai/`)

- `models.ts`: the offered models, each with an id and a label. Safe to import in the browser.
- `aiFailureReason.ts`: the union `invalidRequest`, `aiNotConfigured`, `invalidKey`, `budgetExhausted`, `rateLimited`, `modelUnavailable`, `timeout`, `invalidModelOutput`, `unexpected`.
- `openRouterClient.ts`: `createOpenRouterClient({ apiKey })`. Server-only, and the only file that imports `openai`.
- `runStructuredCompletion.ts`: messages and a Zod response schema go in; the request asks for JSON matching that schema; the reply is parsed and validated; invalid output gets one retry that includes the validation error; the result carries the usage record.
- `toAiFailureReason.ts`: a provider error to a reason.
- `aiCallRecord.ts`: model, tokens, cost, latency, outcome.

**Decisions**

- The reply is validated with Zod whatever the provider promises about structured output.
- Aborting propagates through `signal`, and an aborted call is never retried.
- Logs carry the AI task's name, the model, tokens, latency and the reason. Never a prompt, a cell value or a key.

**Done when**

- Specs with a fake client: valid output passes; invalid then valid is one retry and a success; invalid twice is `invalidModelOutput`; statuses 401, 402, 429, 5xx and a timeout map to their reasons; an abort rejects without a retry; usage is recorded for every call.

## T6.2 — Add the normalize-values AI task

**After:** T6.1, T2.2

**What it does:** given the distinct values of one column, the model groups spellings of the same real-world value (`CA`, `Calif.`, `California`) under one canonical form, and names placeholders that are particular to this file (`TBD`, `no data`).

**Build**

- The five files in `src/ai/tasks/normalizeValues/`.
- `src/ai/createAiRoute.ts`: the handler factory every route uses. It parses the body with the contract, picks the key, runs the AI task with `request.signal`, and maps any failure to `{ reason }` with the right status.
- `src/app/api/ai/normalize-values/route.ts`.

**Request:** the column's header and dominant type, and its values with counts, most frequent first. Caps: 200 values per request, 80 characters per value, 12 columns per file.

**Which columns are sent:** categorical text columns, most repeated first. D7: in a file under 200 rows, every short-text column is eligible, because repetition means nothing at that size and a reviewer's own test file is likely to be small.

**Reply:** groups, each with a canonical value, its variants, a reason and a confidence; and a list of placeholders with a reason.

**Reference validation**

- Every variant must be one of the values that were sent.
- A value joins at most one group.
- A group with fewer than two distinct spellings is dropped.
- A canonical value that was not in the file is allowed, and marked so the UI can say "not in your file".
- Every dropped claim is counted, and the count travels with the result.

**Issues:** each group becomes an `inconsistent` issue suggesting `mapValues`; placeholders become a `missing` issue suggesting `mapValues` to empty.

**Prompt rules:** the values sit inside a delimited block labeled as data; the model is told to group only spellings of one real-world value, to keep different values apart, and to return nothing when unsure.

**Done when**

- Specs: the request builder picks the right columns and respects the caps, including the small-file rule; the prompt snapshot is reviewed; the runner drops a variant that was not sent and counts it; the issues are built correctly; the route answers `400 invalidRequest` to a bad body and `aiNotConfigured` without a key.
- One real call on the sample's `state` column groups the planted spellings. The reply is pasted in the report and saved as the fixture.

## T6.3 — Run AI tasks from the browser with progress, abort and retry

**After:** T6.2, T5.2

**Build**

- Worker: `buildAiRequests()` returns every request for the file, already capped.
- Store: `run` with its `RunId` and one entry per AI task (`queued`, `running`, `done`, or `failed` with a reason); actions `startRun` and `retryTask`.
- `src/features/workspace/state/runAiTasks.ts`: a queue with at most `AI_CONCURRENCY` (3) calls in flight, each a `fetch` with the run's `AbortSignal`.
- `src/engine/issues/mergeAiIssues.ts`: D8.
- UI: `RunProgress` (one row per AI task, announced through `aria-live`), `AiFailure` with `aiFailureCopy` (`Record<AiFailureReason, string>`), and the AI source and confidence band on issue cards.

**Decisions**

- Check suggestions are reviewable while AI tasks run. Each AI task's issues land when it finishes.
- A result whose `runId` is not the current one is discarded.
- Loading a new file aborts the run and cancels the worker call.
- A failed AI task leaves everything else intact and offers a retry.

**Done when**

- Store spec: a held response plus a new file means nothing from the old run lands; a failure shows its reason and a retry works; no more than three calls are ever in flight.
- Merge spec: an AI group that contains a check issue's variants absorbs it; a check issue that is already decided is not absorbed.
- e2e with the route mocked from the fixture: AI issues appear after the check issues, and the AI task shows as done.
- Screenshots at the three widths.

## T6.4 — Add the confirm-duplicates AI task

**After:** T6.3, T4.5

**What it does:** given pairs of rows that look alike, the model says which pairs are the same record, and which row's value to keep in each column.

**Build:** the five files in `src/ai/tasks/confirmDuplicates/` and the route `/api/ai/confirm-duplicates`.

**Request:** the column headers and up to 30 candidate pairs, each with both rows' values, the similarity and the evidence.

**Reply, per pair:** whether it is a duplicate, a confidence, a reason, which row to keep, and for each differing column which side's value to keep.

**Reference validation**

- A pair id must be one that was sent.
- Column choices must be in range.
- The merged row can only hold values from the two rows. The contract has no field through which a new value could arrive.

**Issues:** a confirmed pair becomes a `duplicate` issue suggesting `mergeRows`. A rejected pair produces nothing.

**Done when**

- Specs: request builder, prompt snapshot, runner validation (a made-up pair id is dropped and counted), issue builder.
- One real call on the sample's candidates confirms the planted near copies and rejects a look-alike pair of different people. The reply is in the report and saved as the fixture.
- e2e: a merge suggestion appears and can be accepted.

## T6.5 — Add the assess-suspicious-rows AI task

**After:** T6.3, T4.4

**What it does:** the model looks at the rows the checks flagged, plus a sample of the others, and says which really are suspicious and why.

**Build:** the five files in `src/ai/tasks/assessSuspiciousRows/` and the route `/api/ai/assess-suspicious-rows`.

**Request:** a summary of each column (header, type, typical range or top values), up to 40 rows flagged by checks, and up to 40 other rows chosen with a seeded sample. D7: when the file has fewer rows than the cap, every row is sent.

**Reply, per row:** whether it is suspicious, the column if one stands out, a reason, a confidence, and a suggested value only when the right value is unambiguous.

**Reference validation**

- A row id must be one that was sent, and a column must be in range.
- A suggested value is accepted only together with `isSuspicious`.

**Issues**

- A flagged row keeps its check issue and gains the model's reason. When the model finds it plausible, the issue gains that note and sorts lower. It is never deleted: the check's evidence stays visible.
- A sampled row the model finds suspicious becomes a new `suspicious` issue, with `setCells` when a value was suggested.

**Done when**

- Specs: request builder (including the small-file rule), prompt snapshot, runner validation, issue builder.
- One real call explains the planted outlier and leaves ordinary sampled rows alone.
- A hand-made file of 15 rows, written to look like something a reviewer would try, gets sensible issues from a real run. The result is in the report.
- Fixture saved; e2e passes.

## T6.6 — Show what was sent to the AI and what it cost

**After:** T6.3

**Build**

- Store: `aiCalls`, one record per call: the AI task, the model, the request body exactly as sent, tokens, cost, latency, the outcome, and the number of dropped claims.
- `src/lib/formatCost.ts`.
- `TransparencyPanel`: the list of calls, each expandable to its request, and the totals.
- A summary in the header, such as `3 AI calls · 4.1k tokens · $0.004`.

**Decisions**

- The panel shows the browser's own request bodies. That is the literal answer to "what left my machine".
- A visitor's own key never appears anywhere in the panel.
- Dropped claims are shown, not hidden: "2 of 14 claims were dropped because they cited values that were not sent".

**Done when**

- Component spec: the totals add up; a failed call shows its reason; the request shown equals the request sent.
- e2e: after a mocked run, the header shows the call count and the panel lists the request.
- Screenshots at the three widths.

## T6.7 — Choose the model for a run

**After:** T6.3

**Build**

- `settingsStore` with the model id.
- `ModelPicker`, fed by `models.ts` and disabled while a run is in flight.
- "Run again": reruns the AI tasks with the selected model. AI issues are replaced, decisions on check issues are kept, and the earlier run's calls stay in the panel, labeled by model.

**Done when**

- Store spec: a rerun replaces only the AI issues; the picker is disabled in flight.
- e2e: pick another model and the next request carries its id.

**Checkpoint B:** the brief is fully met.
