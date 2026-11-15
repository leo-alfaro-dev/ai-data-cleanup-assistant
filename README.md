# ai-data-cleanup-assistant

Live demo: https://ai-data-cleanup-assistant.vercel.app

## Demo limits

The hosted demo is meant to spend from one OpenRouter key with a credit limit. A visitor gets 40 AI requests per 10 minutes on that key, counted per server instance, so the limit is best effort. A full run on the sample is 6 requests, about 37,000 tokens and about $0.01 on Claude Haiku 5.5, measured from the recorded run in `e2e/fixtures/ai`.

When the limit or the credit is used up, the checks keep working and the AI tasks say why. **Use your own key** accepts your own OpenRouter key: it stays in the tab and is never stored on the server.
