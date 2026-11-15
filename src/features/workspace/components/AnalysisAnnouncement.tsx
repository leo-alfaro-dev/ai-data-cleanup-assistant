import { twMerge } from 'tailwind-variants';
import { countOf } from '@/lib/countOf';
import { analysisStageCopy } from '../analysisStageCopy';
import { useAnalysisPhase } from '../state/analysisStore';

export type AnalysisAnnouncementProps = React.ComponentProps<'p'>;

// Always mounted, so a screen reader hears each change whichever panel is showing.
export function AnalysisAnnouncement({
  className = '',
  ...props
}: AnalysisAnnouncementProps) {
  const phase = useAnalysisPhase();
  const announcement = (() => {
    if (phase.status === 'running') return analysisStageCopy[phase.stage];
    if (phase.status === 'failed') return 'The checks could not run.';
    if (phase.status === 'done') {
      return `Checks finished. ${countOf({ count: phase.result.issues.length, noun: 'issue' })} found.`;
    }

    return '';
  })();

  return (
    <p aria-live="polite" className={twMerge('sr-only', className)} {...props}>
      {announcement}
    </p>
  );
}
