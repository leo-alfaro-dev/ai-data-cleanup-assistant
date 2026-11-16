import { useRef } from 'react';
import type { IconType } from 'react-icons';
import { RxCheck, RxCross2, RxReset } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import type { Issue } from '@/engine/issues/issue';
import { applyLabel } from '../applyLabel';
import { ariaKeysOf } from '../shortcuts';
import {
  reviewActions,
  useDecision,
  useSelectedIssueId,
} from '../state/reviewStore';
import { ShortcutHint } from './ShortcutHint';

export type DecisionActionsProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

// The main button keeps its place whichever decision is made, so keyboard focus stays on it.
// Only the selected issue's apply button is solid: the one the A key acts on.
export function DecisionActions({
  issue,
  className = '',
  ...props
}: DecisionActionsProps) {
  const decision = useDecision(issue.id);
  const isSelected = useSelectedIssueId() === issue.id;
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
    if (issue.suggestion !== null) {
      return {
        label: applyLabel(issue.suggestion),
        icon: RxCheck,
        variant: isSelected ? 'primary' : 'tint',
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
      className={twMerge('flex items-center justify-end gap-1.5', className)}
      {...props}
    >
      {decision === undefined && hasSuggestion && (
        <Button
          variant="ghost"
          aria-keyshortcuts={ariaKeysOf('reject')}
          onClick={() => {
            reviewActions.reject(issue.id);
            mainButton.current?.focus();
          }}
        >
          <RxCross2 aria-hidden className="size-3.5" />
          Keep as is
          <ShortcutHint action="reject" />
        </Button>
      )}
      {decision !== undefined && (
        <Badge
          variant={decision.status === 'rejected' ? 'neutral' : 'positive'}
          className="motion-safe:animate-settle"
        >
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
  if (status === 'accepted') return 'Applied';
  if (status === 'edited') return 'Edited and applied';

  return hasSuggestion ? 'Kept as is' : 'Dismissed';
}
