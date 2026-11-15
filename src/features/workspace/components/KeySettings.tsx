import { useId, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { IoKeyOutline } from 'react-icons/io5';
import { RxEyeClosed, RxEyeOpen } from 'react-icons/rx';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import { aiFailureCopy } from '../aiFailureCopy';
import { useRejectedKeyRevision } from '../state/aiStore';
import {
  settingsActions,
  useHasOwnKey,
  useOwnKeyRevision,
} from '../state/settingsStore';

export type KeySettingsProps = Omit<ButtonProps, 'children'>;

export function KeySettings(props: KeySettingsProps) {
  const hasOwnKey = useHasOwnKey();
  const isKeyRejected =
    useRejectedKeyRevision() === useOwnKeyRevision() && hasOwnKey;
  const [draft, setDraft] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canSave = draft.trim() !== '';

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button {...props}>
          <IoKeyOutline aria-hidden className="size-3.5" />
          {hasOwnKey ? 'Own key in use' : 'Use your own key'}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Own key settings"
          align="start"
          sideOffset={6}
          className="z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm focus:outline-none"
        >
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) return;

              settingsActions.saveOwnKey(draft);
              setDraft('');
              setIsRevealed(false);
            }}
          >
            <label
              htmlFor={inputId}
              className="text-xs font-medium text-text-secondary"
            >
              OpenRouter key
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={inputId}
                ref={inputRef}
                type={isRevealed ? 'text' : 'password'}
                value={draft}
                autoComplete="off"
                spellCheck={false}
                placeholder={hasOwnKey ? 'A key is set' : 'sk-or-…'}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                aria-label={isRevealed ? 'Hide the key' : 'Show the key'}
                aria-pressed={isRevealed}
                variant="ghost"
                className="px-2"
                onClick={() => setIsRevealed((current) => !current)}
              >
                {isRevealed ? (
                  <RxEyeClosed aria-hidden className="size-4" />
                ) : (
                  <RxEyeOpen aria-hidden className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-text-secondary">
              The key stays in this tab and is sent only with AI requests,
              through this app&apos;s server. It is never stored there.
            </p>
            {isKeyRejected && (
              <p role="alert" className="text-xs text-danger">
                {aiFailureCopy.invalidKey}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={!canSave}>
                Use this key
              </Button>
              {hasOwnKey && (
                <Button
                  onClick={() => {
                    settingsActions.removeOwnKey();
                    inputRef.current?.focus();
                  }}
                >
                  Remove key
                </Button>
              )}
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
