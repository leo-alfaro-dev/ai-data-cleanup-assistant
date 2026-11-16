# Epic 9: Recipe

**Outcome:** the accepted rules become a file. Next month's export is cleaned in one step, with no AI call.

**Why it matters:** cleaning is rarely done once. The same export arrives every month with the same mess. Because changes are rules and not edits (D1), the work of one review can be replayed for free, and exactly. This turns a one-off assistant into a repeatable process, and it is the closing moment of the demo.

**Show after this epic:** load next month's file with last month's recipe. It is clean before the progress bar finishes, and the panel reads "0 AI calls".

## T9.1: Export accepted rules as a recipe

**After:** T5.5

**Build**

- `src/engine/recipe/recipe.ts`: the Zod schema. `version: 1`, the source file's facts, a creation date, and the rules.
- `src/engine/recipe/buildRecipe.ts`: accepted changes to a recipe.
- The export dialog gains "Recipe (.json)", with a line that says what a recipe leaves out.

**Decisions**

- Only rules enter a recipe. Row-specific changes stay in the change log, because a row number means nothing in another file.
- A rule names its column by header text, plus an occurrence number when the header repeats, so it survives reordered columns.
- `dropDuplicateRows` is stored as its mode. The groups are recomputed on the file the recipe is replayed on.
- The schema is versioned from the first commit, so a later change can migrate old recipes instead of breaking them.

**Done when**

- Specs: only rules are included; columns are written as header text, with the occurrence for a repeated header; a recipe survives a round trip through JSON and the schema.
- e2e: download the recipe and parse it.

## T9.2: Replay a recipe on another file without AI

**After:** T9.1

**Build**

- `src/engine/recipe/replayRecipe.ts`: dataset and recipe to changes, plus the rules that were skipped and why.
- Worker: `replayRecipe(recipe)`.
- UI: "Apply a recipe" on the first screen; dropping a `.json` next to a CSV; `RecipeReport` with rules applied, rules skipped, cells changed and "0 AI calls".
- `public/samples/customers-next-month.csv`: a second sample from another seed with the same kinds of errors, and a "Try the recipe on next month's file" action.

**Decisions**

- Applied rules arrive as accepted decisions. They can still be inspected, undone and exported like any other.
- A rule whose column is missing is skipped and reported. The replay never fails as a whole because of one rule.
- A file that is not a valid recipe is rejected with a reason, and nothing is applied.

**Done when**

- Specs: replaying a recipe on its source file reproduces the accepted rule changes exactly; reordered columns still match; a missing column skips its rule and reports it; an invalid recipe is rejected.
- e2e: load the sample, accept, export the recipe; load next month's sample with the recipe; the changes are applied and no request is made to any AI route.
