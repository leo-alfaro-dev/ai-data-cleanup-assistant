import { useCallback, useState } from 'react';
import { RxCheck, RxReset } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import type { Change } from '@/engine/changes/change';
import { isValidEdit } from '@/engine/changes/isValidEdit';
import type { Issue } from '@/engine/issues/issue';
import { focusIssueCard } from '../focusIssueCard';
import { previewActions, useDraftPreview } from '../state/previewStore';
import { reviewActions } from '../state/reviewStore';
import { MapValuesEditor } from './MapValuesEditor';
import { MergeRowsEditor } from './MergeRowsEditor';
import { PreviewSummary } from './PreviewSummary';
import { SetCellsEditor } from './SetCellsEditor';

export type IssueEditorProps = React.ComponentProps<'div'> & {
  issue: Issue;
  suggestion: Change;
  initial: Change;
};

export function IssueEditor({
  issue,
  suggestion,
  initial,
  className = '',
  ...props
}: IssueEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [resetCount, setResetCount] = useState(0);
  const preview = useDraftPreview();
  const focusFirstField = useCallback((element: HTMLElement | null) => {
    element?.querySelector<HTMLElement>('input, select')?.focus();
  }, []);
  const close = (action: () => void) => {
    action();
    focusIssueCard(issue.id);
  };
  const canSave =
    isValidEdit({ original: suggestion, edited: draft }) &&
    preview?.status === 'ready';

  const change = (next: Change) => {
    setDraft(next);
    void previewActions.loadDraft(next);
  };

  return (
    <div
      data-shortcuts="off"
      className={twMerge(
        'flex flex-col gap-3 rounded-xl border border-primary/25 bg-wash p-3',
        className
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close(() => reviewActions.cancelEdit());
      }}
      {...props}
    >
      <div
        role="group"
        aria-label="Edit the suggestion"
        ref={focusFirstField}
        className="flex flex-col gap-3"
      >
        {draft.kind === 'mapValues' && suggestion.kind === 'mapValues' && (
          <MapValuesEditor
            key={resetCount}
            original={suggestion}
            initial={draft}
            onChange={change}
          />
        )}
        {draft.kind === 'mergeRows' && suggestion.kind === 'mergeRows' && (
          <MergeRowsEditor
            original={suggestion}
            draft={draft}
            onChange={change}
          />
        )}
        {draft.kind === 'setCells' && (
          <SetCellsEditor draft={draft} onChange={change} />
        )}
      </div>
      <PreviewSummary entry={preview ?? undefined} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={!canSave}
          onClick={() =>
            close(() =>
              reviewActions.edit({ issueId: issue.id, change: draft })
            )
          }
        >
          <RxCheck aria-hidden className="size-3.5" />
          Save and apply
        </Button>
        <Button onClick={() => close(() => reviewActions.cancelEdit())}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setResetCount((count) => count + 1);
            change(suggestion);
          }}
        >
          <RxReset aria-hidden className="size-3.5" />
          Reset to suggestion
        </Button>
      </div>
    </div>
  );
}
