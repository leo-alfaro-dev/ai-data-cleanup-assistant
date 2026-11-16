import { ProgressBar } from '@/components/ProgressBar';
import { formatCount } from '@/lib/formatCount';
import { useIssues } from '../state/useIssues';
import { useDecisions } from '../state/reviewStore';

export type ReviewProgressProps = Omit<
  React.ComponentProps<typeof ProgressBar>,
  'value' | 'label' | 'emphasis'
>;

export function ReviewProgress(props: ReviewProgressProps) {
  const total = useIssues().length;
  const decided = useDecisions().size;
  const share = total === 0 ? 0 : (decided / total) * 100;

  return (
    <ProgressBar
      emphasis="headline"
      value={share}
      label={`${formatCount(decided)} of ${formatCount(total)} decided`}
      {...props}
    />
  );
}
