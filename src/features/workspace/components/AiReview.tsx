import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import { eyebrow } from '@/components/eyebrow';
import { VisibleValue } from '@/components/VisibleValue';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Issue } from '@/engine/issues/issue';
import { confidenceLabels } from '../confidenceLabels';
import { useIssueNotes } from '../state/useIssueNotes';
import { useFacts } from '../state/workspaceStore';
import { toColumnLabel } from '../toColumnLabel';
import { AiAvatar } from './AiAvatar';

export type AiReviewProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

export function AiReview({ issue, className = '', ...props }: AiReviewProps) {
  const notes = useIssueNotes(issue.id);
  const { columns } = useFacts();

  return (
    <div className={twMerge('flex flex-col gap-1.5', className)} {...props}>
      <h4 className={eyebrow()}>AI review</h4>
      <ul aria-label="AI review" className="flex flex-col gap-2">
        {notes.map((note) => (
          <li
            key={`${note.rowId}:${note.column}`}
            className="flex gap-2.5 rounded-xl border border-border bg-surface p-3 text-sm"
          >
            <AiAvatar className="mt-px" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary tabular-nums">
                  Row {toRowNumber(note.rowId)}
                </span>
                <Badge variant={note.isSuspicious ? 'outline' : 'positive'}>
                  {note.isSuspicious ? 'Suspicious' : 'Plausible'}
                </Badge>
                {note.column !== null && (
                  <span>{toColumnLabel({ columns, column: note.column })}</span>
                )}
                <span>{confidenceLabels[note.confidence]}</span>
              </div>
              <p>{note.reason}</p>
              {note.suggestedValue !== null && (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                  Suggested value, not applied:
                  <VisibleValue
                    value={note.suggestedValue}
                    className="rounded-md bg-tint px-1.5 py-0.5 font-mono text-added"
                  />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
