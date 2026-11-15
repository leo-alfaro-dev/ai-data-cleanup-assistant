import type { Issue } from '@/engine/issues/issue';
import { usePreview } from '../state/previewStore';
import type { PreviewSummaryProps } from './PreviewSummary';
import { PreviewSummary } from './PreviewSummary';

export type IssueExamplesProps = Omit<PreviewSummaryProps, 'entry'> & {
  issue: Issue;
};

export function IssueExamples({ issue, ...props }: IssueExamplesProps) {
  return <PreviewSummary entry={usePreview(issue.id)} {...props} />;
}
