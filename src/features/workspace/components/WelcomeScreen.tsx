import { useId, useRef } from 'react';
import {
  RxCheckCircled,
  RxEyeOpen,
  RxFileText,
  RxLockClosed,
  RxTable,
  RxUpload,
} from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { eyebrow } from '@/components/eyebrow';
import { IconCircle } from '@/components/IconCircle';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';
import { formatCount } from '@/lib/formatCount';
import { SAMPLE_ROW_COUNT } from '../sampleFile';
import { useFileDrop } from '../state/useFileDrop';
import { workspaceActions } from '../state/workspaceStore';
import { StartCard } from './StartCard';

export type WelcomeScreenProps = React.ComponentProps<'section'>;

export function WelcomeScreen({
  className = '',
  ...props
}: WelcomeScreenProps) {
  const { isDragging, handlers } = useFileDrop();
  const inputRef = useRef<HTMLInputElement>(null);
  const factsTitleId = useId();

  return (
    <section
      aria-label="Get started"
      className={twMerge('relative flex flex-col gap-10', className)}
      {...handlers}
      {...props}
    >
      {isDragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-primary bg-wash/90"
        >
          <p className="flex items-center gap-2 text-lg font-semibold text-primary">
            <RxUpload className="size-5" />
            Drop the CSV to load it
          </p>
        </div>
      )}
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          <span className="block">Every row checked.</span>{' '}
          <span className="block">Every change yours to make.</span>
        </h2>
        <p className="text-base text-pretty text-text-secondary sm:text-lg">
          Duplicates, inconsistent values, missing data and suspicious records
          are found across the whole file, explained, and changed only when you
          say so.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StartCard
          tone="solid"
          icon={RxTable}
          label="Start here"
          title="Try the sample"
        >
          <p>
            {formatCount(SAMPLE_ROW_COUNT)} synthetic customer rows with planted
            errors in all four categories. See what the checks and the AI find.
          </p>
          <Button
            variant="inverse"
            size="lg"
            className="mt-auto"
            onClick={() => void workspaceActions.loadSample()}
          >
            Load sample data
          </Button>
        </StartCard>
        <StartCard
          tone="tint"
          icon={RxFileText}
          label="Your file"
          title="Bring your own CSV"
        >
          <p>
            Comma, semicolon, tab or pipe separated, up to{' '}
            {MAX_FILE_BYTES / 1024 / 1024} MB. Choose it, or drag it here.
          </p>
          <Button
            size="lg"
            className="mt-auto"
            onClick={() => inputRef.current?.click()}
          >
            <RxUpload aria-hidden className="size-4" />
            Choose a CSV file
          </Button>
          <input
            ref={inputRef}
            type="file"
            aria-label="Choose a CSV file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void workspaceActions.loadFile(file);
            }}
          />
        </StartCard>
      </div>
      <div className="flex flex-col gap-6 border-t border-border pt-8">
        <h2 id={factsTitleId} className={eyebrow({ className: 'text-center' })}>
          How your data is handled
        </h2>
        <ul
          aria-labelledby={factsTitleId}
          className="grid gap-6 sm:grid-cols-3"
        >
          {FACTS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 text-sm">
              <IconCircle icon={Icon} />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{title}</span>
                <span className="text-text-secondary">{text}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FACTS = [
  {
    Icon: RxLockClosed,
    title: 'The file stays in the browser',
    text: 'Parsing and every check run on this device.',
  },
  {
    Icon: RxEyeOpen,
    title: 'The AI gets summaries',
    text: 'A small file is sent whole. The “What was sent to the AI” panel shows each request.',
  },
  {
    Icon: RxCheckCircled,
    title: 'Nothing changes without you',
    text: 'Every change is a suggestion: apply it, edit it, or keep the data as is. The original file is never modified.',
  },
];
