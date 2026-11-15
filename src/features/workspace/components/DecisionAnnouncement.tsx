import { twMerge } from 'tailwind-variants';
import { countOf } from '@/lib/countOf';
import { describeIssue } from '../issueCopy';
import { useLastStep } from '../state/reviewStore';
import { useIssues } from '../state/useIssues';
import { useFacts } from '../state/workspaceStore';

export type DecisionAnnouncementProps = React.ComponentProps<'p'>;

// Always mounted, so a screen reader hears each decision whichever panel is showing.
export function DecisionAnnouncement({
  className = '',
  ...props
}: DecisionAnnouncementProps) {
  const step = useLastStep();
  const issues = useIssues();
  const { columns } = useFacts();

  const announcement = (() => {
    if (step === null) return '';
    if (step.kind !== 'decided') {
      const verb = step.kind === 'undone' ? 'Undid' : 'Redid';

      return `${verb} ${countOf({ count: step.count, noun: 'decision' })}. ${countOf({ count: step.undoDepth, noun: 'step' })} can be undone.`;
    }

    const verb = {
      accepted: 'Accepted',
      edited: 'Edited and accepted',
      rejected: 'Rejected',
      removed: 'Removed the decision on',
    }[step.status];
    if (step.count > 1) {
      return `${verb} ${countOf({ count: step.count, noun: 'issue' })}.`;
    }

    const issue = issues.find(({ id }) => id === step.issueId);

    return issue
      ? `${verb} ${describeIssue({ issue, columns }).title}.`
      : `${verb} 1 issue.`;
  })();

  return (
    <p aria-live="polite" className={twMerge('sr-only', className)} {...props}>
      {announcement}
    </p>
  );
}
