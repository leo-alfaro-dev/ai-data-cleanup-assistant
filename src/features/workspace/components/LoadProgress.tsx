import { RxFileText } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { ProgressBar } from '@/components/ProgressBar';
import type { LoadStage } from '@/workers/loadStage';

export type LoadProgressProps = React.ComponentProps<'section'> & {
  fileName: string;
  stage: LoadStage;
  percentage: number;
};

export function LoadProgress({
  fileName,
  stage,
  percentage,
  className = '',
  ...props
}: LoadProgressProps) {
  return (
    <section
      aria-label={`Loading ${fileName}`}
      className={twMerge(
        'flex flex-col gap-4 rounded-lg border border-border bg-surface p-6',
        className
      )}
      {...props}
    >
      <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <RxFileText aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{fileName}</span>
      </p>
      <ProgressBar value={percentage} label={loadStageCopy[stage]} />
      <p aria-live="polite" className="sr-only">
        {loadStageCopy[stage]}
      </p>
    </section>
  );
}

const loadStageCopy: Record<LoadStage, string> = {
  reading: 'Reading the file',
  decoding: 'Decoding text',
  parsing: 'Parsing rows',
};
