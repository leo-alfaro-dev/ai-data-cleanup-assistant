import { RxCross2, RxPencil1 } from 'react-icons/rx';
import { tv } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { eyebrow } from '@/components/eyebrow';
import { isEditable } from '@/engine/changes/isEditable';
import { effectiveChange } from '@/engine/decisions/effectiveChange';
import type { Issue } from '@/engine/issues/issue';
import { describeChange } from '../changeCopy';
import { confidenceLabels } from '../confidenceLabels';
import { describeIssue } from '../issueCopy';
import { listIssueGroups } from '../listIssueGroups';
import { sourceLabels } from '../sourceLabels';
import { usePreview } from '../state/previewStore';
import {
  reviewActions,
  useDecision,
  useEditingIssueId,
} from '../state/reviewStore';
import { useIssueNotes } from '../state/useIssueNotes';
import { useFacts } from '../state/workspaceStore';
import { AffectedRows } from './AffectedRows';
import { AiReview } from './AiReview';
import { CategoryBadge } from './CategoryBadge';
import { ChangeCounts } from './ChangeCounts';
import { DuplicateGroup } from './DuplicateGroup';
import { IssueEditor } from './IssueEditor';
import { IssueExamples } from './IssueExamples';
import { ShortcutTooltip } from './ShortcutTooltip';

export type IssueDetailProps = React.ComponentProps<'section'> & {
  issue: Issue;
};

const MAX_SHOWN_GROUPS = 3;

// Only the evidence and the affected rows scroll, so the issue and its change stay in view.
// The rows list is size-contained: it fills the height the rest needs instead of setting it.
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
  const preview = usePreview(issue.id);
  const hasCellCounts =
    preview?.status === 'ready' && preview.preview.counts.cells > 0;
  const isEditing = useEditingIssueId() === issue.id;
  const canEdit = isEditable(issue.suggestion) && isEditable(change);
  const hasRows = issue.rows.length > 0;
  const hasEvidence =
    issue.suggestion !== null || hasAiReview || groups.length > 0;

  return (
    <section
      aria-label="Issue detail"
      className={issueDetail({ isEditing, className })}
      {...props}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CategoryBadge category={issue.category} />
            <span className="text-xs text-text-secondary">
              {sourceLabels[issue.source]} ·{' '}
              {confidenceLabels[issue.confidence]}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h3 className="text-base font-semibold tracking-tight break-words">
              {title}
            </h3>
            <p className="text-sm text-text-secondary">{summary}</p>
          </div>
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
      <div
        className={detailBody({
          hasRows,
          className: AFFECTED_MIN_HEIGHT[Math.min(issue.rows.length, 5)],
        })}
      >
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-start gap-3 rounded-lg bg-wash py-1 pr-1 pl-3">
            <div className="min-w-0 flex-1 py-1.5 text-sm">
              <h4 className={eyebrow({ className: 'mr-3 inline' })}>
                What changes
                {decision?.status === 'edited' && ' · edited'}
              </h4>
              <p className="inline">
                {change
                  ? describeChange({ change, columns })
                  : 'No change is suggested. Dismiss the issue once you have checked the values.'}
                {change && !isEditing && hasCellCounts && (
                  <>
                    {' '}
                    <ChangeCounts
                      counts={preview.preview.counts}
                      className="font-normal text-text-secondary"
                    />
                  </>
                )}
              </p>
            </div>
            {canEdit && !isEditing && (
              <ShortcutTooltip action="edit">
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => reviewActions.startEdit()}
                >
                  <RxPencil1 aria-hidden className="size-3.5" />
                  Edit
                </Button>
              </ShortcutTooltip>
            )}
          </div>
          {hasEvidence && (
            <div className="flex flex-col gap-3 overflow-auto">
              {isEditing && issue.suggestion && change && (
                <IssueEditor
                  issue={issue}
                  suggestion={issue.suggestion}
                  initial={change}
                />
              )}
              {!isEditing && issue.suggestion && (
                <IssueExamples issue={issue} />
              )}
              {hasAiReview && <AiReview issue={issue} />}
              {groups.slice(0, MAX_SHOWN_GROUPS).map((group) => (
                <DuplicateGroup key={group.join(',')} rows={group} />
              ))}
            </div>
          )}
          {groups.length > MAX_SHOWN_GROUPS && (
            <p className="border-t border-border pt-2 text-xs text-text-secondary">
              Showing {MAX_SHOWN_GROUPS} of {groups.length} groups. Choose a row
              to see the others in the grid.
            </p>
          )}
        </div>
        {hasRows && <AffectedRows issue={issue} className="md:contain-size" />}
      </div>
    </section>
  );
}

// Room for the heading and up to five affected rows (see ITEM_HEIGHT): the list sets no height.
const AFFECTED_MIN_HEIGHT = [
  '',
  'md:min-h-20',
  'md:min-h-28',
  'md:min-h-36',
  'md:min-h-44',
  'md:min-h-52',
] as const;

const issueDetail = tv({
  base: 'flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-4 py-3',
  variants: {
    isEditing: { true: 'max-h-[65%]', false: 'max-h-[45%]' },
  },
});

const detailBody = tv({
  base: 'flex min-h-0 flex-col gap-3 max-md:overflow-y-auto max-md:*:shrink-0 md:grid md:gap-x-5',
  variants: {
    hasRows: { true: 'md:grid-cols-[minmax(0,1fr)_16rem]', false: '' },
  },
});
