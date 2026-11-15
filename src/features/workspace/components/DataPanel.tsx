import { twMerge } from 'tailwind-variants';
import { toPanelId, toTabId } from '../panelIds';
import { useSelectedIssue } from '../state/useSelectedIssue';
import { DataGrid } from './grid/DataGrid';
import { GridToolbar } from './grid/GridToolbar';
import { IssueDetail } from './IssueDetail';

export type DataPanelProps = React.ComponentProps<'section'>;

export function DataPanel({ className = '', ...props }: DataPanelProps) {
  const issue = useSelectedIssue();

  return (
    <section
      id={toPanelId('data')}
      role="tabpanel"
      aria-labelledby={toTabId('data')}
      className={twMerge('flex min-h-0 min-w-0 flex-1 flex-col', className)}
      {...props}
    >
      {issue && <IssueDetail issue={issue} />}
      <GridToolbar />
      <DataGrid />
    </section>
  );
}
