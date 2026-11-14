# Epic 10 — Proof

**Outcome:** a table in the README: how much of the planted errors each model finds, how often it raises a false alarm, what a run costs and how long it takes. The default model is chosen from that table.

**Why it matters:** anyone can say an AI feature works. Very few one-day projects can say how well, and what the AI adds over plain code. The checks-only row from Epic 3 makes that comparison possible: it shows what code finds for free, and each model row shows what the extra cents buy.

**Show after this epic:** the table, and one sentence: "the default model was chosen because it finds X% of the planted errors for $Y a run".

## T10.1 — Benchmark models on planted errors: accuracy, cost and latency

**After:** T6.5, T3.2 · **Needs your approval of the spend**

**Build**

- `eval/run.ts` gains a model mode, `yarn eval --models a,b,c`. For each model it runs the checks and the three AI tasks through their runners with a real client, scores the result with the scorer from T3.2, and records tokens, cost and latency.
- `--estimate`: prints the number of calls and an upper bound on the cost, and makes no call.
- `eval/results/<model>.json` per model.
- `eval/buildSummary.ts`: the result files to `eval/results/summary.md`.

**The table**, one row for checks only and one per model:

| Column                             | Meaning                                                |
| ---------------------------------- | ------------------------------------------------------ |
| Precision and recall, per category | How many claims were right; how many errors were found |
| Suggestion accuracy                | How often the suggested value equals the clean value   |
| Cost per run                       | From the provider's usage records                      |
| Time per run                       | Wall clock, with the app's concurrency                 |

**Decisions**

- Three models: one from Anthropic, one from OpenAI and one low-cost model, with ids taken from OpenRouter's model list at the time of the run.
- Every model gets the same dataset and seed.
- The summary is always generated from the result files and never edited by hand.
- The runners import `server-only`, so the script runs with Node's `react-server` condition. Confirm this works before the first paid call.

**Done when**

- `--estimate` prints the calls and the cost bound, and you approve it.
- The run completes for each model, and the result files and the summary are committed with the date and the model ids.
- A spec covers the summary builder.

**Also update:** `CLAUDE.md` commands, with the final form of `yarn eval`.

## T10.2 — Choose the default model and limits from the benchmark

**After:** T10.1

**Build**

- `models.ts`: the default becomes the model with the best recall per dollar among those above a precision floor. The rule is stated once, at the constant.
- The demo's credit limit and the limiter's constants are checked against the measured cost per run.
- The README's accuracy section is filled from `summary.md`.

**Done when**

- The choice, the rule and the numbers behind it are in the README.
- No number in the README differs from the result files.
