import { tv, twMerge } from 'tailwind-variants';
import { useReviewPanel } from '../state/reviewStore';
import { useWorkspaceShortcuts } from '../state/useWorkspaceShortcuts';
import { AiAnnouncement } from './AiAnnouncement';
import { AnalysisAnnouncement } from './AnalysisAnnouncement';
import { DataPanel } from './DataPanel';
import { DecisionAnnouncement } from './DecisionAnnouncement';
import { IssuesPanel } from './IssuesPanel';
import { PanelTabs } from './PanelTabs';

export type ReviewWorkspaceProps = React.ComponentProps<'div'>;

export function ReviewWorkspace({
  className = '',
  ...props
}: ReviewWorkspaceProps) {
  const panel = useReviewPanel();
  useWorkspaceShortcuts();

  return (
    <div
      className={twMerge('flex min-h-0 flex-1 flex-col lg:flex-row', className)}
      {...props}
    >
      <AnalysisAnnouncement />
      <AiAnnouncement />
      <DecisionAnnouncement />
      <PanelTabs className="lg:hidden" />
      <IssuesPanel
        className={panelVisibility({ isHidden: panel !== 'issues' })}
      />
      <DataPanel className={panelVisibility({ isHidden: panel !== 'data' })} />
    </div>
  );
}

const panelVisibility = tv({
  variants: { isHidden: { true: 'max-lg:hidden', false: '' } },
});
