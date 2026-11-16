import { useId, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { RxCheck, RxEyeClosed, RxEyeOpen } from 'react-icons/rx';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import { eyebrow } from '@/components/eyebrow';
import { TextInput } from '@/components/TextInput';
import { aiFailureCopy } from '../aiFailureCopy';
import { useRejectedKeyRevision } from '../state/aiStore';
import {
  settingsActions,
  useHasOwnKey,
  useOwnKeyRevision,
} from '../state/settingsStore';
import { FailureNote } from './FailureNote';

export type KeySettingsProps = Omit<ButtonProps, 'children'>;

export function KeySettings(props: KeySettingsProps) {
  const hasOwnKey = useHasOwnKey();
  const isKeyRejected =
    useRejectedKeyRevision() === useOwnKeyRevision() && hasOwnKey;
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canSave = draft.trim() !== '';

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button variant={hasOwnKey ? 'tint' : 'secondary'} {...props}>
          {hasOwnKey ? 'Your key' : 'Add your key'}
          {hasOwnKey && <RxCheck aria-hidden className="size-3.5" />}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Own key settings"
          align="start"
          sideOffset={8}
          className="z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm shadow-xl shadow-text-primary/10 focus:outline-none"
        >
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) return;

              settingsActions.saveOwnKey(draft);
              setDraft('');
              setIsRevealed(false);
              setIsOpen(false);
            }}
          >
            <label htmlFor={inputId} className={eyebrow()}>
              OpenRouter key
            </label>
            <div className="flex items-center gap-1.5">
              <TextInput
                id={inputId}
                ref={inputRef}
                type={isRevealed ? 'text' : 'password'}
                value={draft}
                autoComplete="off"
                spellCheck={false}
                placeholder={hasOwnKey ? 'A key is set' : 'sk-or-…'}
                className="h-9 flex-1 px-3"
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                aria-label={isRevealed ? 'Hide the key' : 'Show the key'}
                aria-pressed={isRevealed}
                variant="ghost"
                className="px-2 text-primary"
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
              <FailureNote className="text-xs">
                {aiFailureCopy.invalidKey}
              </FailureNote>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={!canSave}>
                Use this key
              </Button>
              {hasOwnKey && (
                <Button
                  variant="ghost"
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
