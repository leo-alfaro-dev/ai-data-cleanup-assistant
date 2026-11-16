export type ShortcutAction =
  | 'nextIssue'
  | 'previousIssue'
  | 'accept'
  | 'reject'
  | 'edit'
  | 'undo'
  | 'redo'
  | 'toggleView'
  | 'jumpToGrid'
  | 'help';

export type Shortcut = {
  action: ShortcutAction;
  // A letter matches either case, so Caps Lock changes nothing; `shift` is then required.
  key: string;
  shift?: true;
  repeats?: true;
  display: string;
  label: string;
};

// The one list: the listener, the help dialog and the hints on buttons all read it.
export const SHORTCUTS: readonly Shortcut[] = [
  {
    action: 'nextIssue',
    key: 'j',
    repeats: true,
    display: 'J',
    label: 'Next issue',
  },
  {
    action: 'previousIssue',
    key: 'k',
    repeats: true,
    display: 'K',
    label: 'Previous issue',
  },
  { action: 'accept', key: 'a', display: 'A', label: 'Apply the suggestion' },
  { action: 'reject', key: 'r', display: 'R', label: 'Keep as is, or dismiss' },
  { action: 'edit', key: 'e', display: 'E', label: 'Edit the suggestion' },
  { action: 'undo', key: 'u', display: 'U', label: 'Undo the last step' },
  {
    action: 'redo',
    key: 'u',
    shift: true,
    display: 'Shift U',
    label: 'Redo the step',
  },
  {
    action: 'toggleView',
    key: 'o',
    display: 'O',
    label: 'Switch the grid between Original and Cleaned',
  },
  {
    action: 'jumpToGrid',
    key: 'g',
    display: 'G',
    label: 'Show the issue’s first row in the grid',
  },
  { action: 'help', key: '?', display: '?', label: 'Show the shortcuts' },
];

export function ariaKeysOf(action: ShortcutAction): string {
  const shortcut = SHORTCUTS.find((candidate) => candidate.action === action);
  if (!shortcut) return '';

  return shortcut.shift ? `Shift+${shortcut.key}` : shortcut.key;
}

export function displayOf(action: ShortcutAction): string {
  return (
    SHORTCUTS.find((shortcut) => shortcut.action === action)?.display ?? ''
  );
}
