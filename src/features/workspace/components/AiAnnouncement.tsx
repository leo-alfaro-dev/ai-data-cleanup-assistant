import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { aiTaskLabels } from '../aiTaskLabels';
import { useAiRun } from '../state/aiStore';
import { summarizeAiTasks } from '../state/summarizeAiTasks';

export type AiAnnouncementProps = React.ComponentProps<'p'>;

// Always mounted, so a task that finishes is heard whichever panel is showing.
export function AiAnnouncement({
  className = '',
  ...props
}: AiAnnouncementProps) {
  const run = useAiRun();
  const announcement = useMemo(
    () =>
      summarizeAiTasks(run?.jobs ?? [])
        .filter(({ status }) => status === 'done' || status === 'failed')
        .map(({ task, status }) => `${aiTaskLabels[task]}: ${status}.`)
        .join(' '),
    [run]
  );

  return (
    <p aria-live="polite" className={twMerge('sr-only', className)} {...props}>
      {announcement}
    </p>
  );
}
