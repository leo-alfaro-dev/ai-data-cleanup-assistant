import { tv, twMerge } from 'tailwind-variants';
import { useReviewPanel } from '../state/reviewStore';
import { AiAnnouncement } from './AiAnnouncement';
import { AnalysisAnnouncement } from './AnalysisAnnouncement';
import { DataPanel } from './DataPanel';
import { IssuesPanel } from './IssuesPanel';
import { PanelTabs } from './PanelTabs';

export type ReviewWorkspaceProps = React.ComponentProps<'div'>;

export function ReviewWorkspace({
  className = '',
  ...props
}: ReviewWorkspaceProps) {
  const panel = useReviewPanel();

  return (
    <div
      className={twMerge('flex min-h-0 flex-1 flex-col lg:flex-row', className)}
      {...props}
    >
      <AnalysisAnnouncement />
      <AiAnnouncement />
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
