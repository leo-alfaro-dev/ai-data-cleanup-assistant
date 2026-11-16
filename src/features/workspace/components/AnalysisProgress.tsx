import { twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
import { ProgressBar } from '@/components/ProgressBar';
import type { AnalysisStage } from '@/workers/analysisStage';
import { analysisStageCopy } from '../analysisStageCopy';

export type AnalysisProgressProps = React.ComponentProps<'div'> & {
  stage: AnalysisStage;
  percentage: number;
};

export function AnalysisProgress({
  stage,
  percentage,
  className = '',
  ...props
}: AnalysisProgressProps) {
  return (
    <div
      className={twMerge(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs',
        className
      )}
      {...props}
    >
      <p className={eyebrow()}>Checking the file</p>
      <ProgressBar value={percentage} label={analysisStageCopy[stage]} />
    </div>
  );
}
