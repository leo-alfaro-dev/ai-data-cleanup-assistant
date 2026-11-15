import { RxCross2 } from 'react-icons/rx';
import { tv, twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import type { Issue } from '@/engine/issues/issue';
import { ariaKeysOf } from '../shortcuts';
import { describeChange } from '../changeCopy';
import { confidenceLabels } from '../confidenceLabels';
import { describeIssue } from '../issueCopy';
import { listIssueGroups } from '../listIssueGroups';
import { effectiveChange } from '@/engine/decisions/effectiveChange';
import { isEditable } from '@/engine/changes/isEditable';
import {
  reviewActions,
  useDecision,
  useEditingIssueId,
} from '../state/reviewStore';
import { useIssueNotes } from '../state/useIssueNotes';
import { useFacts } from '../state/workspaceStore';
import { sourceLabels } from '../sourceLabels';
import { AffectedRows } from './AffectedRows';
import { AiReview } from './AiReview';
import { CategoryBadge } from './CategoryBadge';
import { DuplicateGroup } from './DuplicateGroup';
import { IssueEditor } from './IssueEditor';
import { IssueExamples } from './IssueExamples';
import { ShortcutHint } from './ShortcutHint';

export type IssueDetailProps = React.ComponentProps<'section'> & {
  issue: Issue;
};

const MAX_SHOWN_GROUPS = 3;

export function IssueDetail({
  issue,
  className = '',
  ...props
}: IssueDetailProps) {
  const { columns } = useFacts();
  const { title, summary } = describeIssue({ issue, columns });
  const groups = listIssueGroups(issue);
  const hasAiReview = useIssueNotes(issue.id).length > 0;
  const decision = useDecision(issue.id);
  const change = effectiveChange({ suggestion: issue.suggestion, decision });
  const isEditing = useEditingIssueId() === issue.id;
  const canEdit = isEditable(issue.suggestion) && isEditable(change);

  return (
    <section
      aria-label="Issue detail"
      className={twMerge(
        'flex max-h-[45%] shrink-0 flex-col gap-3 overflow-y-auto border-b border-border bg-surface p-3',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CategoryBadge category={issue.category} />
            <span className="text-xs text-text-secondary">
              {sourceLabels[issue.source]} ·{' '}
              {confidenceLabels[issue.confidence]}
            </span>
          </div>
          <h3 className="text-sm font-semibold break-words">{title}</h3>
          <p className="text-sm text-text-secondary">{summary}</p>
        </div>
        <Button
          variant="ghost"
          aria-label="Close issue detail"
          className="px-2"
          onClick={() => reviewActions.select(null)}
        >
          <RxCross2 aria-hidden className="size-4" />
        </Button>
      </div>
      <div className={detailBody({ hasRows: issue.rows.length > 0 })}>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-medium text-text-secondary">
                What changes
                {decision?.status === 'edited' && ' · edited'}
              </h4>
              {canEdit && !isEditing && (
                <Button
                  variant="ghost"
                  aria-keyshortcuts={ariaKeysOf('edit')}
                  onClick={() => reviewActions.startEdit()}
                >
                  Edit
                  <ShortcutHint action="edit" />
                </Button>
              )}
            </div>
            <p className="text-sm">
              {change
                ? describeChange({ change, columns })
                : 'No change is suggested. Dismiss the issue once you have checked the values.'}
            </p>
          </div>
          {isEditing && issue.suggestion && change && (
            <IssueEditor
              issue={issue}
              suggestion={issue.suggestion}
              initial={change}
            />
          )}
          {!isEditing && issue.suggestion && <IssueExamples issue={issue} />}
          {hasAiReview && <AiReview issue={issue} />}
          {groups.slice(0, MAX_SHOWN_GROUPS).map((group) => (
            <DuplicateGroup key={group.join(',')} rows={group} />
          ))}
          {groups.length > MAX_SHOWN_GROUPS && (
            <p className="text-xs text-text-secondary">
              Showing {MAX_SHOWN_GROUPS} of {groups.length} groups. Choose a row
              to see the others in the grid.
            </p>
          )}
        </div>
        {issue.rows.length > 0 && <AffectedRows issue={issue} />}
      </div>
    </section>
  );
}

const detailBody = tv({
  base: 'grid gap-4',
  variants: {
    hasRows: { true: 'md:grid-cols-[minmax(0,1fr)_18rem]', false: '' },
  },
});
