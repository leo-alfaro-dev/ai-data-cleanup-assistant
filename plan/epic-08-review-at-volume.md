# Epic 8 — Review at volume

**Outcome:** a reviewer clears dozens of issues in seconds, never loses work, and can correct a suggestion before accepting it.

**Why it matters:** a real file produces tens or hundreds of issues. Accepting them one click at a time is where a cleanup tool stops being used. This epic is the difference between a demo of a feature and a tool someone would keep open.

**Show after this epic:** the whole sample reviewed in under twenty seconds without touching the mouse, then one keystroke undoes the last step.

## T8.1 — Decide in bulk and undo any step

**After:** T5.3

**Build**

- Store: `decisionHistory`, a stack of decision batches, with `undo` and `redo`.
- Actions `acceptAll({ category, minimumConfidence })` and `rejectAll({ category })`.
- UI: per category, "Accept all certain and high" with the number it will accept shown before the click; Undo and Redo buttons.

**Decisions**

- One bulk action is one undo step.
- Bulk accept never touches an issue without a suggestion, or one with `low` confidence, unless the user widens it.
- A new decision clears the redo stack.

**Done when**

- Store spec: a bulk accept followed by one undo restores every decision; redo reapplies them; a new decision clears redo.
- Component spec: the button states how many issues it will accept, and that number is what gets accepted.
- e2e: bulk accept a category, then undo.

## T8.2 — Review from the keyboard

**After:** T8.1

**Build**

- `src/components/Kbd.tsx`.
- `src/features/workspace/shortcuts.ts`: one list of key, action and label. Every other place reads from it.
- `src/hooks/useShortcuts.ts`: one listener, ignored while the user types in a field.
- Focus in `reviewStore`: next and previous issue, accept, reject, edit, undo, redo, toggle Original / Cleaned, jump to the grid, open help.
- `ShortcutHelp`, a dialog generated from the list; shortcut hints on the buttons; the focused card scrolls into view; each decision is announced through `aria-live`.

**Decisions**

- Single letters, as in tools reviewers already know: `J` and `K` to move, `A` to accept, `R` to reject, `E` to edit, `U` to undo, `?` for help.
- The shortcut list is the single source. The help dialog and the button hints cannot drift from the behavior, because they are rendered from it.
- Focus is always visible.

**Done when**

- Component spec with `user-event`: `J`, `A`, `J`, `R`, `U` produce the expected decisions; keys do nothing while typing in a field; the help dialog lists every entry of the list.
- e2e: the sample is fully reviewed using only the keyboard.
- Screenshots showing the focused card and the help dialog.

## T8.3 — Edit a suggestion before accepting it

**After:** T5.4

**Build**

- `IssueEditor`, by kind of change:
  - a value mapping: change the canonical value, or take a variant out of the group;
  - a merge: choose the row to keep and, per column, whose value;
  - a cell value: type it.
- Worker: `previewChange(change)` for fresh counts and examples as the user edits.
- The decision `edited` stores the edited change, and "Reset to suggestion" restores the original.

**Decisions**

- An edit is validated like model output: where a change must point at existing values or rows, it does.
- The original suggestion is never lost, so an edit can always be compared with it or dropped.

**Done when**

- Store spec: the edited change drives the cleaned view and the export.
- Component spec: taking a variant out updates the count before anything is accepted.
- e2e: edit a canonical value and accept; the grid shows the typed value and the export contains it.
