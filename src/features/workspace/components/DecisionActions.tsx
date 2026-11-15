import { useRef } from 'react';
import type { IconType } from 'react-icons';
import { RxCheck, RxCross2, RxReset } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import type { Issue } from '@/engine/issues/issue';
import { ariaKeysOf } from '../shortcuts';
import { reviewActions, useDecision } from '../state/reviewStore';
import { ShortcutHint } from './ShortcutHint';

export type DecisionActionsProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

// The main button keeps its place whichever decision is made, so keyboard focus stays on it.
export function DecisionActions({
  issue,
  className = '',
  ...props
}: DecisionActionsProps) {
  const decision = useDecision(issue.id);
  const mainButton = useRef<HTMLButtonElement>(null);
  const hasSuggestion = issue.suggestion !== null;

  const main: {
    label: string;
    icon: IconType | null;
    variant: ButtonProps['variant'];
    shortcut: string | undefined;
    run: () => void;
  } = (() => {
    if (decision !== undefined) {
      return {
        label: 'Clear decision',
        icon: RxReset,
        variant: 'ghost',
        shortcut: undefined,
        run: () => reviewActions.resetDecision(issue.id),
      };
    }
    if (hasSuggestion) {
      return {
        label: 'Accept',
        icon: RxCheck,
        variant: 'primary',
        shortcut: ariaKeysOf('accept'),
        run: () => reviewActions.accept(issue.id),
      };
    }

    return {
      label: 'Dismiss',
      icon: null,
      variant: 'secondary',
      shortcut: ariaKeysOf('reject'),
      run: () => reviewActions.reject(issue.id),
    };
  })();

  return (
    <div
      className={twMerge('flex items-center justify-end gap-2', className)}
      {...props}
    >
      {decision === undefined && hasSuggestion && (
        <Button
          aria-keyshortcuts={ariaKeysOf('reject')}
          onClick={() => {
            reviewActions.reject(issue.id);
            mainButton.current?.focus();
          }}
        >
          <RxCross2 aria-hidden className="size-3.5" />
          Reject
          <ShortcutHint action="reject" />
        </Button>
      )}
      {decision !== undefined && (
        <Badge variant="outline">
          {decision.status !== 'rejected' && (
            <RxCheck aria-hidden className="size-3" />
          )}
          {decisionCopy({ status: decision.status, hasSuggestion })}
        </Badge>
      )}
      <Button
        ref={mainButton}
        variant={main.variant}
        aria-keyshortcuts={main.shortcut}
        onClick={main.run}
      >
        {main.icon && <main.icon aria-hidden className="size-3.5" />}
        {main.label}
        {main.shortcut !== undefined && (
          <ShortcutHint action={hasSuggestion ? 'accept' : 'reject'} />
        )}
      </Button>
    </div>
  );
}

function decisionCopy({
  status,
  hasSuggestion,
}: {
  status: 'accepted' | 'edited' | 'rejected';
  hasSuggestion: boolean;
}): string {
  if (status === 'accepted') return 'Accepted';
  if (status === 'edited') return 'Edited and accepted';

  return hasSuggestion ? 'Rejected' : 'Dismissed';
}
