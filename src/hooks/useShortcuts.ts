import { useEffect } from 'react';

type ShortcutBinding<Action extends string> = {
  action: Action;
  key: string;
  shift?: true;
  repeats?: true;
};

/**
 * One keydown listener for plain keys. It ignores modified keys, composition, typing in a field
 * and anything that happens inside a dialog.
 */
export function useShortcuts<Action extends string>({
  shortcuts,
  handlers,
}: {
  shortcuts: readonly ShortcutBinding<Action>[];
  handlers: Readonly<Record<Action, () => void>>;
}): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModified = event.ctrlKey || event.metaKey || event.altKey;
      if (isModified || event.isComposing || isIgnoredTarget(event.target)) {
        return;
      }

      const shortcut = shortcuts.find((binding) => matches({ binding, event }));
      if (!shortcut || (event.repeat && !shortcut.repeats)) return;

      event.preventDefault();
      handlers[shortcut.action]();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, handlers]);
}

function matches({
  binding,
  event,
}: {
  binding: { key: string; shift?: true };
  event: KeyboardEvent;
}): boolean {
  if (event.key.toLowerCase() !== binding.key) return false;

  const isLetter = /^[a-z]$/.test(binding.key);

  return !isLetter || event.shiftKey === Boolean(binding.shift);
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return target.closest(IGNORED_SELECTOR) !== null;
}

const IGNORED_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="menu"], [role="listbox"], [data-shortcuts="off"]';
