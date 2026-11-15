import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsActions, settingsStore$ } from './settingsStore';

describe('settingsStore own key', () => {
  beforeEach(() => {
    settingsActions.removeOwnKey();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the trimmed key in memory and mirrors it to sessionStorage only', () => {
    settingsActions.saveOwnKey('  sk-or-visitor  ');

    expect(settingsStore$.getState().ownKey).toBe('sk-or-visitor');
    expect(window.sessionStorage.getItem('ownOpenRouterKey')).toBe(
      'sk-or-visitor'
    );
    expect(window.localStorage.length).toBe(0);
  });

  it('drops the key from memory and from sessionStorage on removal', () => {
    settingsActions.saveOwnKey('sk-or-visitor');

    settingsActions.removeOwnKey();

    expect(settingsStore$.getState().ownKey).toBeNull();
    expect(window.sessionStorage.getItem('ownOpenRouterKey')).toBeNull();
  });

  it('treats a blank key as no key', () => {
    settingsActions.saveOwnKey('   ');

    expect(settingsStore$.getState().ownKey).toBeNull();
  });

  it('keeps the key in memory when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    settingsActions.saveOwnKey('sk-or-visitor');

    expect(settingsStore$.getState().ownKey).toBe('sk-or-visitor');
  });

  it('keeps the chosen model when the key changes', () => {
    settingsActions.selectModel('google/gemini-2.5-flash-lite');

    settingsActions.saveOwnKey('sk-or-visitor');

    expect(settingsStore$.getState().modelId).toBe(
      'google/gemini-2.5-flash-lite'
    );
    settingsActions.selectModel('anthropic/claude-haiku-5.5');
  });
});
