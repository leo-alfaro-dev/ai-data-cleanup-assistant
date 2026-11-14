# Epic 7 — Safe live demo

**Outcome:** a public URL anyone can open, with sample data one click away, that a single visitor cannot drain or break. This is checkpoint C.

**Why it matters:** reviewers compare many submissions, and a link that works in ten seconds beats instructions to clone and configure. But a public page that spends money on every visit needs limits, or the demo is dead by the time the reviewer opens it, possibly days after submission.

**Show after this epic:** open the link in a private window, click Load sample data, and watch the full flow with nothing installed and no key.

## T7.1 — Rate-limit hosted-key calls and explain limit and budget failures

**After:** T6.3

**Build**

- `src/ai/rateLimiter.ts`: a fixed window per visitor address, for calls on the hosted key.
- `createAiRoute` applies it and answers `429 rateLimited`.
- OpenRouter's out-of-credit response maps to `budgetExhausted`.
- `aiFailureCopy` entries for `rateLimited`, `budgetExhausted` and `aiNotConfigured`. Each says that the checks still work, and the first two offer the visitor's own key.

**Decisions**

- The limiter counts per server instance, so it is a baseline and not a guarantee. The hard limits are the spend cap and the firewall rule in T7.3.
- The window and the number of calls are named constants, sized from the measured calls per run in T7.3.
- Calls on a visitor's own key skip the limiter.
- The visitor address comes from the platform's forwarded header, read in one function with a spec.

**Done when**

- Specs: the limit trips at the threshold and resets after the window; own-key calls are not counted; the address is read correctly from the header; each reason has its copy.
- Component spec: each failure shows its message, and the checks' issues are still on screen.

## T7.2 — Let visitors use their own OpenRouter key

**After:** T7.1

**Build**

- `KeySettings`, a popover: paste a key, a line saying it stays in this tab, and a way to remove it.
- `settingsStore.ownKey`: in memory, mirrored to `sessionStorage`.
- Requests carry the key in the `x-openrouter-key` header, and `createAiRoute` uses it when present.
- The failure `invalidKey` is shown inside the popover.

**Decisions**

- Never `localStorage`. Never logged, never shown in the transparency panel.
- This is a setting, not a gate: the hosted key stays the default.
- The input is a password field with a reveal toggle.

**Done when**

- Route spec: the header key is preferred over the hosted one, and no log call ever receives it.
- e2e: set a key and the mocked route receives the header; remove it and the header is gone.
- Screenshots at the three widths.

## T7.3 — Set up the production key and spend cap, and link the live demo

**After:** T7.2, T0.4 · **Needs you**

**Needs you**

- Create a production key in OpenRouter with a credit limit, separate from the development key.
- Add it to the Vercel project's environment variables.
- Add a Firewall rate-limit rule on `/api/ai/*` if the plan includes one.

**Build**

- Measure one full run on the sample from the transparency panel: calls, tokens, cost.
- Size the credit limit and the limiter's constants from that measurement, and state the arithmetic in the report.
- The README gets the live URL and a short note on the demo's limits.

**Done when**

- On the live URL: the sample loads, the AI tasks finish, and the panel shows the cost.
- A deliberately wrong own key gives `invalidKey`, and the app keeps working on the checks.
- The limits are written in the README, and CI is green.

## T7.4 — Design the first screen: sample data, privacy facts and metadata

**After:** T5.2

**Build**

- `WelcomeScreen`: one line that says what the app does; **Load sample data** as the primary action; the whole area is a drop target.
- Three short facts under it: the file stays in the browser; only summaries go to the AI, and the panel shows exactly what; nothing changes without a decision.
- A line describing the sample: about 1,150 synthetic customer rows with planted errors.
- Page metadata and `src/app/opengraph-image.tsx`, so the link has a proper preview when it is shared.

**Decisions**

- The facts are claims the app can prove on screen, each one backed by a feature. No adjectives.
- The sample is the default path. A reviewer should reach a full result without owning a messy CSV.

**Done when**

- e2e: from a cold start, using only the sample button, the full flow runs: load, issues, accept, export.
- `/opengraph-image` renders.
- Screenshots at the three widths.

**Checkpoint C:** the demo is live and safe to share.
