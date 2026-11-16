import { RxFileText } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { BackdropIcon } from '@/components/BackdropIcon';
import { eyebrow } from '@/components/eyebrow';
import { IconCircle } from '@/components/IconCircle';
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
        'relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm',
        className
      )}
      {...props}
    >
      <BackdropIcon icon={RxFileText} className="-right-6 -bottom-10 size-40" />
      <div className="relative flex min-w-0 items-center gap-3">
        <IconCircle icon={RxFileText} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={eyebrow()}>Loading</p>
          <p className="truncate text-base font-semibold">{fileName}</p>
        </div>
      </div>
      <ProgressBar
        className="relative"
        value={percentage}
        label={loadStageCopy[stage]}
      />
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
