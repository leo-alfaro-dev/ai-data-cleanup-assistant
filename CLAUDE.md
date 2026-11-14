# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AI Data Cleanup Assistant: upload a CSV, and the app finds **duplicates, inconsistent values, missing data and suspicious records**, suggests changes, and lets the user review, edit, accept or reject each one before exporting the cleaned file. Built for a one-day build challenge — scope favors a complete, demoable core over breadth.

It should feel like a meticulous data analyst working beside you: it does the tedious checking, shows its work, and never touches your data without asking. Calm, precise and trustworthy, with Linear-level polish — deliberate typography and spacing, nothing accidental.

### Principles

- **The user decides.** Nothing changes without a decision, every decision can be undone, and the original file is never modified.
- **Show the work.** Every suggestion says what changes, why, how confident, and who found it — a check or the AI. What left the browser, and what it cost, is one click away.
- **Decide in bulk, inspect in detail.** One decision covers a rule across every row it touches; any rule opens to the cells it changes.
- **Density is a feature.** The data is the interface: full density, no chrome competing with the grid.
- **Color carries meaning.** Each category has one color, used everywhere that category appears; diff colors mean before/after and nothing else. Color is never the only signal — a label or icon goes with it.
- **Latency is the enemy.** Large files stay responsive; check suggestions appear at once, AI suggestions land as each task finishes.
- **Keyboard first.** The whole review loop works without a mouse.
- **Truth is the aesthetic.** The UI and README never overstate: no invented metrics, no placeholder features. Accuracy and cost figures come only from real calls and `yarn eval`.
- **Copy is short and declarative** — no hype ("AI-powered magic"), no exclamation points. The categories use the brief's words: Duplicates, Inconsistent values, Missing data, Suspicious records.

### Scope

- **In:** the four categories; review with accept, edit, reject, undo and bulk decisions; export of the cleaned CSV, a change log and a recipe; replaying a recipe; a transparency panel; built-in sample data; an optional own OpenRouter key; `yarn eval`.
- **Out:** accounts, a database or any persistence beyond the tab, Excel files, multi-file joins, collaboration, free-form cell editing (every change is a suggestion).
- **Delivery order** lives in [`plan/`](plan/README.md): epics and tasks, one task per commit, submittable at every checkpoint.

### Vocabulary

Use these words in code and UI; don't introduce synonyms (finding, anomaly, fix).

- **Check** — deterministic code that finds issues across the whole file.
- **Issue** — something wrong in the data, in one of the four categories.
- **Suggestion** — a proposed change that resolves an issue, from a check or the AI.
- **Decision** — the user's verdict on a suggestion: accepted, edited or rejected; pending until made, undoable after.
- **Change** — what a suggestion proposes, expressed as data.
- **Rule** — a row-independent change (map values, trim, standardize a format, drop exact duplicates); one rule can touch many rows.
- **Recipe** — the accepted rules, saved as versioned JSON to replay on another file without AI.
- **Change log** — every cell change the accepted decisions produce.
- **Profile** — per-column statistics that checks and AI tasks work from.
- **Run** — one analysis of the loaded file. **Task** — one kind of AI request within a run. In `plan/` a task is a unit of work, so there the AI kind is always written "AI task".

## Stack

| Concern         | Choice                                                                                  |
| --------------- | --------------------------------------------------------------------------------------- |
| App             | Next.js 16 (App Router) + React 19, TypeScript strict — deployed on Vercel              |
| Package manager | Yarn 4 (`nodeLinker: node-modules`)                                                     |
| Styling         | Tailwind CSS 4, `tailwind-variants` 4 (`tv` and `twMerge`)                              |
| UI primitives   | `radix-ui`                                                                              |
| Icons           | `react-icons`                                                                           |
| State           | `react-global-state-hooks` 16                                                           |
| CSV             | `papaparse`, inside a Web Worker                                                        |
| Web Worker      | `easy-web-worker` 8 (`defineWorker`, `createWorker`)                                    |
| Grid            | Own component on `@tanstack/react-virtual`                                              |
| Validation      | `zod` 4                                                                                 |
| AI              | OpenRouter through the `openai` SDK (Chat Completions); `server-only`                   |
| Tests           | Vitest (Node for `.spec.ts`, jsdom + Testing Library for `.spec.tsx`), Playwright (e2e) |
| Quality         | ESLint, Prettier, cspell, husky + lint-staged; `tsx` for scripts                        |

Majors are listed so code targets the right APIs; `package.json` is the source of truth. **This table is the dependency list** — a new package needs a stated reason, and never a second library for a concern already covered here.

**Next.js 16 changed its APIs.** Before writing Next.js code, read the matching guide in `node_modules/next/dist/docs/` (`AGENTS.md`, which `next dev` maintains, says the same). The 16.4 defaults stay on: `cacheComponents`, `partialPrefetching`, and Tailwind through the `@tailwindcss/turbopack` loader instead of PostCSS. With `cacheComponents` on, the route segment options `dynamic`, `dynamicParams`, `revalidate` and `fetchCache` no longer exist; `maxDuration` does.

## Commands

```bash
yarn dev                     # Next.js dev server on http://localhost:3000 (next free port if taken)
yarn build                   # Production build
yarn start                   # Serve the production build

yarn test                    # Unit specs (Vitest, no watch)
yarn test src/engine/checks/findExactDuplicates.spec.ts   # One file
yarn integrations            # Production build + headless Playwright on port 3100, AI routes mocked
yarn integrations --headed   # Headed mode
yarn eval                    # Accuracy benchmark against real models — costs money, ask first

yarn lint                    # ESLint
yarn typecheck               # next typegen + tsc --noEmit
yarn prettier                # Format all files
yarn spellcheck              # cspell
yarn scan:keys               # Fails if a tracked or staged file contains an OpenRouter key
yarn verify                  # Read-only check of the whole repo: format, spellcheck, key scan, lint, typecheck, unit tests
yarn prepare:commit          # Pre-commit hook only, because lint-staged stages files: then key scan, lint, typecheck, unit tests
```

Path alias: `@/*` → `src/*` (the only one).

## Architecture

### Layout

```
src/
  app/                  # Routes only: layout, page, api/ai/<task-name>/route.ts
  engine/               # Framework-free TypeScript: parse, profile, checks, rules, apply, recipe, export
  ai/                   # Contracts, prompts, task runners, OpenRouter client, model list
  workers/              # dataset.worker.ts and its lazy client, getDatasetWorker()
  features/workspace/   # The app's one screen: upload, grid, review, export, transparency
    WorkspacePage.tsx
    components/
    state/
  components/           # Shared UI primitives (Modal, Button, Kbd, …)
  hooks/                # Shared hooks
  lib/                  # Generic, domain-free, pure helpers (tryCatch, …)
eval/                   # Clean datasets, seeded corruption, runner, committed results
e2e/                    # Playwright specs and recorded AI responses
public/samples/         # Demo CSVs
scripts/                # Repo tooling (scanKeys.ts)
plan/                   # Epics and tasks: what gets built, in what order, and how it is proven
docs/                   # README images, demo script, submission checklist
```

```
CSV ──▶ worker: parse → profile → checks ──▶ check suggestions, reviewable at once
                                   │
                                   └──▶ summaries ──▶ /api/ai/<task-name> ──▶ OpenRouter
                                                       ◀── rules, validated ──┘
decisions ──▶ cleaned view (original + accepted changes) ──▶ export: CSV · change log · recipe
```

- **The engine is pure.** `src/engine/` imports nothing from React, Next, `src/features`, `src/ai` or browser globals, so the worker, the specs and `yarn eval` run the same code. `src/lib/` follows the same rule, so the engine can use it. Lint-enforced.
- **Checks share one signature** — pure functions from dataset and profile to issues, one per file, registered in one list. Adding a check is a file and a list entry.
- **One worker owns the data.** `dataset.worker.ts` only wires engine functions with `defineWorker` (from `easy-web-worker/defineWorker`); the page imports its type alone and calls it through `getDatasetWorker()`, which builds it with `createWorker` (from `easy-web-worker/createWorker`) on first use in the browser. The worker stays single and alive and keeps the parsed rows: parsing, profiling, checks, AI request building, export and recipe replay run there. The rows cross to the page once, in chunks of 10,000 that the page pulls, so the first screen appears while the rest arrive.
- **Next.js needs a native Worker.** Pass `new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' })` to `createWorker`, written literally. A bare `new URL(...)` works in dev but hangs every call in production, so verify any change to the setup with `yarn build && yarn start`. This source can't be force-restarted: no `reboot`, `force` or `maxWorkers`.
- **Long worker methods work in chunks.** Between chunks they pause with `setTimeout` (not `await Promise.resolve()`), stop when `message.isPending()` is false, and report progress; a worker inside a synchronous loop never hears a cancel.
- **Only plain data crosses.** Payloads and results are structured-cloned: no functions or class instances, and a result that can't be cloned hangs the call silently. Errors lose their class, so expected failures come back as a result union, not a throw. The `File` goes to the worker as is and is read there.
- **Scale target:** 100,000 rows × 20 columns without freezing the page — parsing and checks in the worker, the grid virtualized in both directions.

### Data Invariants

- **The original is immutable.** Parsed rows are never mutated; the cleaned value of a cell is derived when it is read, from the original plus accepted decisions. No cleaned copy of the data exists, so undo is flipping a decision.
- **Changes never feed each other.** Every change is a pure function of the original data, so the result does not depend on the order of decisions and a recipe replays identically. When two accepted changes touch one cell, precedence is an explicit cell value, then date format, then value mapping, then whitespace trim; a removed row stays removed.
- **Issues are data, not sentences.** Checks return structured details and the UI words them in `issueCopy`; the model's reason is the only free text.
- **Identity is stable.** Each row keeps its `RowId` from parsing for life — an index into a filtered or sorted array never leaves the component that made it. Columns are keyed by position (`ColumnKey`), never by header text: headers can be empty or repeated.
- **Cells are strings as parsed.** Typed readings (number, date) are derived and never written back unless a decision says so.
- **Nothing is dropped silently.** Ragged rows, empty or duplicate headers and parse errors become issues. A file that is not UTF-8 is decoded as Windows-1252, and the screen says so.
- **Never invent a value.** A missing value is derived from data in the same row or left empty and flagged; neither checks nor the AI guess names, emails or numbers.
- **Never resolve ambiguity silently.** `03/04/2024` (March or April?) is an issue for the user, not a conversion.
- **Values are untrusted text.** Rendered as text only. Formula-like values (spreadsheet formula injection) are suspicious issues, never silently rewritten.
- **Invisible differences are visible.** Cells and diffs show leading and trailing spaces, non-breaking spaces, and empty versus placeholder distinctly.
- **Export is faithful.** Column order, header text and delimiter are preserved; with no accepted decisions, the export reproduces the input rows.
- **Recipes hold only rules.** Row-specific changes go to the change log, not the recipe. Recipes key columns by header text so they replay on files with reordered columns; replay skips a rule whose column is missing and reports it.
- **Repo data is synthetic** — no real personal data in samples, fixtures or eval sets. Names come from small pools, emails use reserved domains (`example.com`), phones use the fictional `555-01xx` range.

What checks find, and what the AI adds:

| Category            | Checks (whole file)                                                                                            | AI (summaries only)                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicates          | Exact and normalized-equal rows; rows sharing an identifier; near-duplicate candidate pairs by name similarity | Confirms candidate pairs and picks, per column, which row's value to keep                                                                               |
| Inconsistent values | Whitespace and casing variants; mixed date formats; values of the wrong type for their column                  | Groups variants of one value (`CA`, `Calif.`, `California`) under a canonical form                                                                      |
| Missing data        | Empty cells and common placeholders (`N/A`, `null`, `-`, `unknown`)                                            | Recognizes placeholders particular to the file (`TBD`, `no data`) while grouping values                                                                 |
| Suspicious records  | Robust outliers, invalid emails, formula-like values, structural issues (ragged rows, repeated headers)        | Reviews flagged rows and a sample, or every row of a small file: explains each, spots implausible combinations, suggests a change only when unambiguous |

### AI Layer

- **The model proposes rules; code applies them.** A task returns value mappings, duplicate verdicts or row-level assessments — never a rewritten file. Code turns them into suggestions.
- **Summaries, not files.** Requests carry distinct values with counts, candidate pairs, or flagged rows and a sample — every list and string capped by named constants in the task's contract. No model call per row or per value: calls per run scale with column count and are capped. A file smaller than a cap is sent whole, so small files are read in full.
- **Model output is untrusted.** Ask for JSON with the response schema (`z.toJSONSchema`) and validate the reply with the same Zod schema whatever the provider promises. Every row id, column and value the reply cites must exist in the request — anything else is dropped and counted. One retry on invalid output, then the task fails with `invalidModelOutput`.
- **Cell values are data, not instructions.** Prompts put them inside a delimited data block and say so.
- **Verify the request, not just the code.** Prompt builders are pure and each has a snapshot spec; read the snapshot in review the way you would read SQL.
- **Confidence is a sort key.** Model-reported confidence orders suggestions and shows as High, Medium or Low — never as a percentage or probability.
- **Every call is accounted.** Model, tokens, cost and latency are recorded per call, shown in the transparency panel, and reused by `yarn eval`.
- **Server-only access.** `openRouterClient.ts` is the only file that imports `openai`; it and the task runners import `server-only`, so the hosted key never reaches the browser. Contracts and `models.ts` are shared with the browser.
- **A visitor's own key stays in the tab.** It is held in memory, or in `sessionStorage` to survive a refresh — never `localStorage`. It travels per request in the `x-openrouter-key` header, is used for that call only, and is never stored, logged or displayed. Routes use it when present and the hosted key otherwise.
- **One folder per task** in `src/ai/tasks/` (`normalizeValues`, `confirmDuplicates`, `assessSuspiciousRows`): `<task>Contract.ts` (request and response schemas, caps), `build<Task>Requests.ts` (profile and check results to capped requests, run in the worker), `build<Task>Prompt.ts`, `run<Task>.ts`, which takes the client as a parameter so specs pass a fake, and `to<Task>Issues.ts` (a validated reply to issues).
- **Route handlers are thin.** `/api/ai/<task-name>` (kebab-case) parses the body with the contract (`400 invalidRequest`), runs the task with `request.signal` so an aborted run stops billing, and returns JSON. Each exports `maxDuration`.
- **Hosted-key calls are rate-limited per visitor** (by IP) in the route handler, returning `429 rateLimited`. The limiter counts per serverless instance, so it is best effort; calls on a visitor's own key skip it.
- **Failures carry a reason, never a message.** Responses use `{ reason }` from the `AiFailureReason` union with a matching status; the provider's message never reaches the client. OpenRouter's out-of-credit response maps to `budgetExhausted`. The UI words each reason once, in a `Record<AiFailureReason, string>`.
- **Logs carry metadata only** — task, model, tokens, latency, reason. Never prompts, cell values or any key.
- **Models** live in `src/ai/models.ts`; one joins the list only after `yarn eval` has measured it.

### Analysis Runs

- **Checks first, AI after.** Check suggestions are reviewable while AI tasks are still running; each task's results land as it finishes, under bounded concurrency.
- **One run at a time.** Each run has a `RunId`, an `AbortController` for its AI requests, and the `CancelablePromise` of its worker call. Loading a new file cancels both, and results whose `runId` isn't current are discarded. A canceled worker call rejects: check `status === 'canceled'` before treating it as an error. The model picker is disabled while a run is in flight.
- **The app works without AI.** With no key, or when a task fails, check suggestions still work and the failed task shows its reason and a retry. When the hosted key is out of budget (`budgetExhausted`) or rate-limited (`rateLimited`), the message also offers the visitor's own key.
- **Long work shows real progress** — parsing and checks a percentage from `.onProgress`, AI tasks their state (queued, running, done, failed) — never a bare spinner.
- **No competing suggestions.** An AI issue that contains a check issue's values absorbs it. A check issue that is already decided is never absorbed.

### State

- **Client state lives in `react-global-state-hooks` stores**, one per concern at `src/features/<feature>/state/<name>Store.ts`: `const <name>Store$ = createGlobalState(makeInitialState(), { actions })`, exporting `<name>Actions = <name>Store$.actions` and slice hooks made with `createSelectorHook`. Loading a new file calls `reset()`.
- **Read the store where the behavior lives.** A component that acts on store state imports its slice hooks and actions directly; a parent never reads the store to thread values or callbacks down as props. Move a cluster all at once — half props, half store is worse than either.
- **Large data stays by reference.** Rows arrive from the worker once and are never spread or copied; decisions live in their own map keyed by `IssueId`, so accepting one never touches the rows. Derived data is a selector, not a stored copy.
- **No `React.createContext`.** When a subtree needs its own copy of state, use `createContext` from `react-global-state-hooks/createContext`; the variable takes a `$` suffix, the file a `Context` suffix.
- **Linear async.** Async work runs in store actions started by user events (load, run, retry), as one readable `async` sequence — never fetch-on-mount or effects reacting to state. `useEffect` is for lifecycle only (subscriptions, listeners), at most one per component or hook; split into named hooks otherwise.

## Code Conventions

### TypeScript

- **Branded types** for ids and domain primitives (`RowId`, `ColumnKey`, `IssueId`, `RunId`) — never plain `string` or `number`.
- **Discriminated unions over optional properties** — a decision is `{ status: 'pending' } | { status: 'accepted' } | { status: 'edited'; change: Change } | { status: 'rejected' }`, not `{ status: string; change?: Change }`.
- **External data is parsed at the boundary** — files in the worker, request bodies in route handlers, model output in task runners — with Zod or a type guard. TypeScript runs with `noUncheckedIndexedAccess`; `any`, non-null `!` and `as` never silence the compiler.
- **`type` over `interface`** — `interface` only for class contracts or overloaded signatures.
- **`import type`** for type-only imports.
- **Named parameters** for functions with 2+ parameters or parameters of the same type: `function applyRule(args: { rule: Rule; rows: readonly Row[] })`.
- **No nested try/catch** — use `tryCatch` from `@/lib/tryCatch`, which returns `{ result, error }` for sync and async callbacks.
- **No abbreviations in identifiers** — `message`, `index`, `column`, `error`, `event`, not `msg`, `idx`, `col`, `err`, `e`. Acronyms are written as words: `rowId`, `parseCsv`, `toJson`.
- **Early returns / fast-fail** to keep nesting shallow.
- **IIFE for linear value computation** — `const label = (() => { if (isExact) return 'Exact'; return 'Near'; })()` over branching assignments.
- **Named booleans for complex conditions** — `const isNearDuplicate = hasSameEmail && nameSimilarity >= NEAR_DUPLICATE_THRESHOLD` before the `if`.
- **Audit every call site before changing shared code** — anything in `src/engine`, `src/ai`, `src/components`, `src/hooks` or `src/lib`, or any symbol imported in more than one place: grep every usage, including callers that rely on a default or an omitted optional parameter. A change isn't done until every affected site is verified.

### Comments

Comments are the exception, not the default — clear names and small functions carry the meaning. Assume a comment is unnecessary and make it earn its place. Most code ships with none.

- **The deletion test** — delete the comment and reread the code. If nothing is lost, it stays deleted. Try to make the code say it (a named boolean, an extracted function, a better type) before reaching for a comment.
- **Only for the non-obvious** — a subtle invariant, a race, a workaround, a constraint the code can't show, or a decision whose rejected alternative looks more obvious than what's here. Never restate the line, label sections, or narrate a change.
- **Two lines, hard cap** — one is better. A comment needing a paragraph is a design needing a name, a type or a smaller function. Never longer than the code it sits on.
- **Why, not what** — no restating what TypeScript already enforces. No JSDoc on internal functions; reserve it for an exported module's contract, four lines at most.
- **Say it once, at the definition** — a rationale lives on the constant, type or function it explains, never repeated at call sites or across files. Cross-reference by name (`see MAX_DISTINCT_VALUES`).
- **Nothing a test name already says** — a comment in a spec earns its place only by explaining why an assertion proves something non-obvious.
- **Nothing this file already says** — restating a convention documented here (parent owns visibility, the original is immutable) is noise.
- **No design essays** — never justify a choice with product prose ("the user stays in control"). State the constraint in one factual clause or say nothing.
- **JSX carries no commentary** — comment inside JSX only for a real trap: a control reachable only by `aria-label`, a class `twMerge` would drop.
- **No artifacts** — no commented-out code, no ownerless TODOs, no notes to the reviewer.
- **Comments are code** — when the line a comment describes moves or dies, the comment moves or dies with it, and so does any comment elsewhere that names it: on a rename or removal, grep the old name across the repo.
- **Re-read before shipping** — the last step of any change is rereading every comment it added and deleting the ones that fail these tests. Expect to delete most of them; a feature-sized change adds comments in the low tens of lines, not the hundreds.

### File Organization

- **One component, hook, util or type per file** — a union and its variants count as one type.
- **Main export first**; internal helpers below it as function declarations, at most two — more means a split into files in the same folder.
- **`src/app/` holds routes only.** `page.tsx` renders the feature page; route handlers are thin adapters. Files in `src/app/` stay server components — `'use client'` starts at the feature page.
- **Feature folders** — page component at the root, sub-components in `components/`, stores in `state/`.

### Shared Code & Reuse

Every new component, hook, calculation or helper starts with two questions: **does it already exist**, and **who else will need it**.

1. **Search before you build.** Look in `src/engine`, `src/components`, `src/hooks` and `src/lib`, then grep `src/` for the name and the concept (`normalize`, `similarity`, `blank`). If it exists, use it; if it needs a small change that keeps its meaning, extend it and audit its call sites. Never write a second copy — an inline expression is a copy too: `value.trim() === ''` re-implements `isBlank`.
2. **Pick the home at creation**, at the lowest level that covers every consumer you can foresee: one feature → `src/features/<feature>/`; data logic → `src/engine/`; UI or hook for two or more features → `src/components/` or `src/hooks/`; generic and domain-free → `src/lib/`.
3. **Promote by moving, never copying** — when a feature-local piece gains a second consumer, move it and update every import.
4. **Shared location, minimal API** — give it the API today's callers need, not options for imagined ones. Things that look alike but mean different things are two components, never one behind a mode flag.

### React Components

- **Root element customization** — every component exports a `Props` type derived from its root element, destructures `className = ''` and `...props`, merges `className` (into the `tv` call, or with `twMerge` when there is no recipe), and spreads `props` on the root:

  ```tsx
  export type CategoryBadgeProps = React.ComponentProps<'span'> & {
    category: IssueCategory;
  };

  export function CategoryBadge({
    category,
    className = '',
    ...props
  }: CategoryBadgeProps) {
    return (
      <span className={categoryBadge({ category, className })} {...props} />
    );
  }

  const categoryBadge = tv({
    base: 'inline-flex items-center gap-1 rounded-md px-1.5 text-xs font-medium',
    variants: {
      category: {
        duplicate: 'bg-duplicate/10 text-duplicate',
        inconsistent: 'bg-inconsistent/10 text-inconsistent',
        missing: 'bg-missing/10 text-missing',
        suspicious: 'bg-suspicious/10 text-suspicious',
      },
    },
  });
  ```

- **No margins on a component's root** — the parent spaces its children with flex/grid `gap`.
- **Parent owns visibility** — a component never conditionally returns `null`; the parent decides whether to render it (`{isVisible && <Component />}`).
- **`<Activity>` to hide while keeping state** — `<Activity mode={isVisible ? 'visible' : 'hidden'}>`, never `display: none`.
- **Composition over configuration** — `children` and named sub-components (`ReviewPanel.Header`) instead of boolean props that change structure or behavior.
- **Small, focused, composable.**
- **Dialogs** — every dialog uses `src/components/Modal.tsx`, built on Radix Dialog.
- **Skeletons** — a loading placeholder is its own `<Name>Skeleton.tsx` beside the component, mirroring its silhouette (same container, layout, breakpoints, one placeholder per element) so nothing shifts when data lands. Root `aria-hidden`; the parent renders the copies.

### Styling

- **Tailwind for all styling**; inline `style` only for values computed at runtime (virtualizer offsets, column widths).
- **Tokens only.** Colors come from the `@theme` tokens in `src/app/globals.css` — surfaces, text, primary (with `on-primary`), danger, one per category, added and removed for diffs. Tailwind's default palette is switched off there (`--color-*: initial`), so palette classes like `bg-blue-500` don't exist; no hex values in components either. A missing color becomes a token first.
- **Custom tokens are colors only** — sizes, spacing and radii use Tailwind's scale. A custom `text-*` size collides with `text-*` colors in `twMerge`, which then drops one of them.
- **`tv` for variants** instead of conditional class strings; **`twMerge` for merging**. Both come from `tailwind-variants` — no `tailwind-merge`, `clsx`, `cva` or `cn`.
- **No Tailwind `group` classes.**
- **Icons from `react-icons`** — `react-icons/rx` first, `react-icons/io5` when `rx` lacks one; no inline SVG icons.
- **Interactive primitives from `radix-ui`** (dialog, dropdown menu, popover, tooltip, tabs). shadcn/ui code may be borrowed only after converting it to these conventions: `cva` → `tv`, `cn` → `twMerge`, `lucide-react` → `react-icons`.
- **Type** — one sans for the UI and one mono for cell values in diffs, both through `next/font`; `tabular-nums` wherever numbers align.
- **Motion** only marks a change the user must notice (a decision applied, a task finishing); nothing decorative.

### Viewport & Accessibility

- **Desktop first.** Cleaning a CSV happens at a desk: design at 1280–1440px. Cap content width where text runs long; let the grid use the space.
- **Phone (390px) must still work** — no page-level horizontal scroll, panels stack, the grid scrolls inside its own container.
- **No hover-only affordances** — anything revealed on hover is reachable by keyboard focus and by tap.
- **Keyboard** — every review action has a shortcut, defined once and listed in the help dialog; focus is always visible; run progress is announced through an `aria-live` region.

## Testing

- **Specs sit beside the code**: `<name>.spec.ts` runs in Node, `<name>.spec.tsx` in jsdom with Testing Library. No spec touches the network.
- **Workers don't exist in Vitest** — specs call the engine functions directly; the worker wiring is covered by e2e.
- **Checks are tested from both sides** — each spec feeds a small inline CSV with what the check must find and what it must leave alone.
- **Round-trips** — exporting with no accepted decisions reproduces the input rows; replaying a recipe on its source file reproduces the accepted rule changes.
- **AI runners use a fake client** — specs cover reference validation (cited rows or values that weren't sent are dropped) and the retry on invalid output. Vitest swaps `server-only` for an empty module, so specs can import the modules it guards.
- **Prove the race with a held response** — hold an AI response, load a new file, resolve the response, and assert nothing from the stale run lands.
- **Absence after presence** — assert that something is not shown only after something that is shown has rendered; before that, absence proves nothing.
- **E2E mocks the AI routes** (`page.route`) with recorded responses — deterministic, offline, free. The happy path: load the sample → review → accept → export.
- **`yarn eval` is the only thing that calls real models.** Seeded corruption of clean datasets gives known ground truth; per model it reports precision and recall per category, cost and latency, written to `eval/results/`. Accuracy claims anywhere cite these files.

## Environment & Deployment

Copy `.env.example` to `.env.local`:

```
OPENROUTER_API_KEY=   # Server only — never prefix with NEXT_PUBLIC_
```

- **No key ever enters git.** `.gitignore` ignores `.env*` except `.env.example`, which holds variable names with empty values. `yarn scan:keys` runs in `prepare:commit`. A key that reaches a commit is revoked, not just deleted: the history is public.
- **Without a key the app still runs** — checks work and AI tasks report `aiNotConfigured`.
- **Separate keys** for production and for development and `yarn eval`, so either can be revoked on its own.
- **Production runs on Vercel**, with its key set in the project's environment variables. That key carries a credit limit set in OpenRouter — the public demo's spend cap — sized from the cost per run that `yarn eval` measures.
- **Vercel builds with the pinned toolchain.** The project sets `ENABLE_EXPERIMENTAL_COREPACK=1`, without which Vercel runs Yarn 1 instead of the `packageManager` version; Node 24 comes from `engines.node`, which overrides the project setting. No `vercel.json`.
- **A Vercel Firewall rate-limit rule** on `/api/ai/*` adds a hard per-visitor limit where the plan includes one; the in-route limiter stays as the baseline.

## Workflow

- **Claude never commits and never stages.** The user is the only one who commits. No `git add`, `git commit`, `git stash` or anything else that changes the index or the history — and no `yarn prepare:commit`, because lint-staged stages files. When work is ready, say so and suggest a commit split and messages.
- **Work follows [`plan/`](plan/README.md).** Take the next open task, build only its scope, tick it in the plan's status list, and report its title as the commit message. A task that turns out bigger than planned is split in the plan, not widened.
- **Commits are small and single-purpose** with imperative subjects; the history is part of the submission.
- **The pre-commit hook runs `yarn prepare:commit`** when the user commits.
- **CI repeats the checks on every push** — `.github/workflows/ci.yml` runs them on the whole repo, plus e2e.
- **Done means:** `yarn verify` passes; UI changes are screenshotted at 1440px, 1280px and 390px; prompt changes come with their reviewed snapshot; accuracy claims cite `eval/results/`.
