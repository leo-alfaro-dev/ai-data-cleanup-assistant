import { describe, expect, it } from 'vitest';
import { ariaKeysOf, SHORTCUTS, shortcutOf } from './shortcuts';

describe('SHORTCUTS', () => {
  it('gives every action once and every key and Shift combination once', () => {
    const actions = SHORTCUTS.map(({ action }) => action);
    const combinations = SHORTCUTS.map(({ key, shift }) => `${key}:${shift}`);

    expect(new Set(actions).size).toBe(actions.length);
    expect(new Set(combinations).size).toBe(combinations.length);
  });

  it('reads the key and the display of an action from the list', () => {
    expect(ariaKeysOf('undo')).toBe('u');
    expect(ariaKeysOf('redo')).toBe('Shift+u');
    expect(shortcutOf('redo')?.display).toBe('Shift U');
  });
});
