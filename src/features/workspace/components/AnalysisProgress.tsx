import { twMerge } from 'tailwind-variants';
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
    <div className={twMerge('flex flex-col gap-2', className)} {...props}>
      <ProgressBar value={percentage} label={analysisStageCopy[stage]} />
    </div>
  );
}
