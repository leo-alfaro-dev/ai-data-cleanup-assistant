import { useRef } from 'react';
import type { IconType } from 'react-icons';
import { RxCheck, RxCross2, RxReset } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import type { ButtonProps } from '@/components/Button';
import { Button } from '@/components/Button';
import type { Issue } from '@/engine/issues/issue';
import { reviewActions, useDecision } from '../state/reviewStore';

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
    run: () => void;
  } = (() => {
    if (decision !== undefined) {
      return {
        label: 'Undo',
        icon: RxReset,
        variant: 'ghost',
        run: () => reviewActions.resetDecision(issue.id),
      };
    }
    if (hasSuggestion) {
      return {
        label: 'Accept',
        icon: RxCheck,
        variant: 'primary',
        run: () => reviewActions.accept(issue.id),
      };
    }

    return {
      label: 'Dismiss',
      icon: null,
      variant: 'secondary',
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
          onClick={() => {
            reviewActions.reject(issue.id);
            mainButton.current?.focus();
          }}
        >
          <RxCross2 aria-hidden className="size-3.5" />
          Reject
        </Button>
      )}
      {decision !== undefined && (
        <Badge variant="outline">
          {decision.status === 'accepted' && (
            <RxCheck aria-hidden className="size-3" />
          )}
          {decisionCopy({ status: decision.status, hasSuggestion })}
        </Badge>
      )}
      <Button ref={mainButton} variant={main.variant} onClick={main.run}>
        {main.icon && <main.icon aria-hidden className="size-3.5" />}
        {main.label}
      </Button>
    </div>
  );
}

function decisionCopy({
  status,
  hasSuggestion,
}: {
  status: 'accepted' | 'rejected';
  hasSuggestion: boolean;
}): string {
  if (status === 'accepted') return 'Accepted';

  return hasSuggestion ? 'Rejected' : 'Dismissed';
}
