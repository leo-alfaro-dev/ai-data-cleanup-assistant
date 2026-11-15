import { twMerge } from 'tailwind-variants';
import { Badge } from '@/components/Badge';
import { VisibleValue } from '@/components/VisibleValue';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Issue } from '@/engine/issues/issue';
import { confidenceLabels } from '../confidenceLabels';
import { useIssueNotes } from '../state/useIssueNotes';
import { useFacts } from '../state/workspaceStore';
import { toColumnLabel } from '../toColumnLabel';

export type AiReviewProps = React.ComponentProps<'div'> & {
  issue: Issue;
};

export function AiReview({ issue, className = '', ...props }: AiReviewProps) {
  const notes = useIssueNotes(issue.id);
  const { columns } = useFacts();

  return (
    <div className={twMerge('flex flex-col gap-1', className)} {...props}>
      <h4 className="text-xs font-medium text-text-secondary">AI review</h4>
      <ul aria-label="AI review" className="flex flex-col gap-2">
        {notes.map((note) => (
          <li
            key={`${note.rowId}:${note.column}`}
            className="flex flex-col gap-1 rounded-md border border-border p-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span className="tabular-nums">
                Row {toRowNumber(note.rowId)}
              </span>
              <Badge variant="outline">
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
                  className="rounded-sm bg-added/10 px-1.5 py-0.5 font-mono text-added"
                />
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
