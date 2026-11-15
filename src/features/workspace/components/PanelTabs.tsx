import { tv } from 'tailwind-variants';
import { formatCount } from '@/lib/formatCount';
import type { WorkspacePanel } from '../panelIds';
import { toPanelId, toTabId, WORKSPACE_PANELS } from '../panelIds';
import { useIssues } from '../state/useIssues';
import { reviewActions, useReviewPanel } from '../state/reviewStore';

export type PanelTabsProps = React.ComponentProps<'div'>;

export function PanelTabs({ className = '', ...props }: PanelTabsProps) {
  const activePanel = useReviewPanel();
  const issueCount = useIssues().length;

  const move = (step: number) => {
    const index = WORKSPACE_PANELS.indexOf(activePanel);
    const next =
      WORKSPACE_PANELS[
        (index + step + WORKSPACE_PANELS.length) % WORKSPACE_PANELS.length
      ];
    if (!next) return;

    reviewActions.showPanel(next);
    document.getElementById(toTabId(next))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Workspace panels"
      className={panelTabs({ className })}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') move(1);
        if (event.key === 'ArrowLeft') move(-1);
      }}
      {...props}
    >
      {WORKSPACE_PANELS.map((panel) => (
        <button
          key={panel}
          id={toTabId(panel)}
          type="button"
          role="tab"
          aria-selected={activePanel === panel}
          aria-controls={toPanelId(panel)}
          tabIndex={activePanel === panel ? 0 : -1}
          className={panelTab({ isActive: activePanel === panel })}
          onClick={() => reviewActions.showPanel(panel)}
        >
          {panelLabels[panel]}{' '}
          {panel === 'issues' && issueCount > 0 && (
            <span className="text-xs tabular-nums">
              {formatCount(issueCount)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const panelLabels: Record<WorkspacePanel, string> = {
  issues: 'Issues',
  data: 'Data',
};

const panelTabs = tv({
  base: 'flex shrink-0 border-b border-border bg-surface px-3',
});

const panelTab = tv({
  base: 'flex h-10 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
  variants: {
    isActive: {
      true: 'border-primary text-text-primary',
      false: 'border-transparent text-text-secondary hover:text-text-primary',
    },
  },
});
