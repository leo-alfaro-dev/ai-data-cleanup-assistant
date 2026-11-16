# Epic 0: Foundation

**Outcome:** every later task starts from green checks, and the app has a public URL that redeploys on every push.

**Why it matters:** tooling and hosting problems are cheapest to find while the app is one screen. A live URL from the first hour also means a demo exists at every later commit.

## T0.1: Scaffold the Next.js app with tests, lint and pre-commit checks

**Status:** done, committed in `45a19eb` together with T0.2

Next.js 16, React 19 and Tailwind 4 with the design tokens, a minimal workspace screen and the `tryCatch` helper. Vitest in Node and jsdom, Playwright against the production build, ESLint rules that turn the `CLAUDE.md` boundaries into errors, cspell, the OpenRouter key scan and the husky pre-commit hook.

**Verified:** `yarn verify` and `yarn integrations` pass. The lint rules were proven with probe files that broke each one on purpose; the key scan caught a planted fake key; screenshots at 1440px and 390px.

## T0.2: Add CI workflow running the checks and e2e on push

**Status:** done, committed in `45a19eb`. Its first run happens on the first push.

**Files:** `.github/workflows/ci.yml`: format, spellcheck, key scan, lint, typecheck, unit specs, then e2e on the production build.

## T0.3: Add the development plan and update CLAUDE.md

**Status:** done, committed in `684f16d`

**Files:** `plan/`, `CLAUDE.md` and `cspell.json`. The `CLAUDE.md` changes are the pointer to this plan and the decisions made while planning (D1, D3, D4, D5, D7, D8 and D10 in [README.md](README.md)), plus `IssueId` as the key for decisions and the five files of an AI task folder.

## T0.4: Deploy the walking skeleton to Vercel

**After:** T0.1 · **Needs you**

**Status:** done. Live at https://ai-data-cleanup-assistant.vercel.app from `main`. The project sets `ENABLE_EXPERIMENTAL_COREPACK=1`, and the build log shows Yarn 4.12.0 through Corepack. The log does not print the Node version; `engines.node` pins 24.x.

**Why:** Vercel with Yarn 4, Node 24 and Next.js 16.4 is untested. Finding out with a one-screen app costs minutes; finding out on submission day costs the demo.

**Needs you**

- Push the branch to GitHub.
- Import the repository in Vercel. The framework is detected; set the Node version to 24.
- Decide which branch is production. `main` is the default; work happens on `development`, which gets preview URLs.

**Build**

- Confirm in Vercel's docs how Yarn 4 is selected from `packageManager`, and add whatever that needs (an environment variable or nothing). Add a `vercel.json` only if something has to differ from the defaults.
- Add the live URL to `README.md`.

**Done when**

- The production URL serves the shell, and its build log shows Yarn 4.12 and Node 24.
- The CI run for the pushed commit is green.
- The URL is in the README.
