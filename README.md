# ai-data-cleanup-assistant

Live demo: https://ai-data-cleanup-assistant.vercel.app

## Demo limits

The hosted demo is meant to spend from one OpenRouter key with a credit limit. A visitor gets 40 AI requests per 10 minutes on that key, counted per server instance, so the limit is best effort. A full run on the sample is 6 requests, 7 when one reply needs a retry, about 40,000 tokens and $0.009 on Gemini 2.5 Flash Lite, from `eval/results/google--gemini-2.5-flash-lite.json`. At that cost each $5 of credit covers about 550 runs.

When the limit or the credit is used up, the checks keep working and the AI tasks say why. **Use your own key** accepts your own OpenRouter key: it stays in the tab and is never stored on the server.

## Accuracy

Errors are planted in a synthetic customer file (1,150 rows, seed 20250601) and recorded, so each run is scored against known truth. Precision is how many claims were right; recall is how many planted errors were found; suggestion accuracy is how often the suggested value equals the clean value. Numbers come from `eval/results/`, written by `yarn eval`, on 2026-11-15. Each model ran the file once.

| Run                            | Duplicates          | Inconsistent values | Missing data        | Suspicious records  | Suggestion accuracy | Cost per run | Time per run |
| ------------------------------ | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------ | ------------ |
| Checks only                    | P 100.0% · R 100.0% | P 100.0% · R 69.2%  | P 100.0% · R 100.0% | P 100.0% · R 100.0% | 100.0%              | $0           | —            |
| `anthropic/claude-haiku-5.5`   | P 100.0% · R 100.0% | P 100.0% · R 100.0% | P 100.0% · R 100.0% | P 100.0% · R 100.0% | 90.1%               | $0.0094      | 34.3 s       |
| `google/gemini-2.5-flash-lite` | P 100.0% · R 100.0% | P 100.0% · R 100.0% | P 100.0% · R 100.0% | P 100.0% · R 100.0% | 100.0%              | $0.0090      | 19.4 s       |
| `openai/gpt-5-mini`            | P 100.0% · R 100.0% | P 12.5% · R 86.2%   | P 100.0% · R 100.0% | P 100.0% · R 100.0% | 24.2%               | ≥ $0.0214    | 71.3 s       |

P is precision and R is recall. The full table, with calls, tokens and failed tasks, is in `eval/results/summary.md`.

- **What the AI adds.** The checks alone find every planted duplicate, missing value and suspicious record on this file. The AI raises recall of inconsistent values from 69.2% to 100% by grouping spellings the checks cannot (`Calif.`, `California`).
- **Default model.** Gemini 2.5 Flash Lite. The rule: among the offered models with precision of at least 90% in every category, the highest recall (planted errors found over planted errors, all categories together); a tie goes to the higher suggestion accuracy, then the lower cost. Gemini and Claude Haiku 5.5 tie on recall at 100%, so suggestion accuracy (100.0% against 90.1%) decides it; Gemini's cost is also 4% lower, which one run cannot separate from noise. One of Gemini's calls returned invalid output and was retried once.
- **Duplicate suggestions** are scored by the row a merge removes: it is right when that row is the planted copy. Of Haiku's 150 removals, 120 were planted copies and 30 were not; every removal the checks make is right, so the 30 come from the pairs the AI confirmed. The result files do not keep the replies, so the cause is not known.
- **GPT-5 mini** flagged 899 cells as inconsistent, 112 of them planted errors, and its suspicious-rows request timed out after 55 seconds, so it is not offered. Its cost is a lower bound: the timed-out call returned no usage.
- **Limits.** One run per model on one synthetic file that is also the demo sample; model answers vary between runs, so small differences are not a ranking.
