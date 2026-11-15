import { useRef } from 'react';
import {
  RxCheckCircled,
  RxEyeOpen,
  RxLockClosed,
  RxUpload,
} from 'react-icons/rx';
import { tv } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';
import { formatCount } from '@/lib/formatCount';
import { SAMPLE_ROW_COUNT } from '../sampleFile';
import { useFileDrop } from '../state/useFileDrop';
import { workspaceActions } from '../state/workspaceStore';

export type WelcomeScreenProps = React.ComponentProps<'section'>;

export function WelcomeScreen({
  className = '',
  ...props
}: WelcomeScreenProps) {
  const { isDragging, handlers } = useFileDrop();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section
      aria-label="Get started"
      className={welcomeScreen({ isDragging, className })}
      {...handlers}
      {...props}
    >
      <p className="max-w-prose text-base font-medium">
        Finds duplicates, inconsistent values, missing data and suspicious
        records in a CSV, and lets you decide what changes.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() => void workspaceActions.loadSample()}
        >
          Load sample data
        </Button>
        <Button onClick={() => inputRef.current?.click()}>
          <RxUpload aria-hidden className="size-3.5" />
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
      </div>
      <p className="text-xs text-text-secondary">
        The sample is {formatCount(SAMPLE_ROW_COUNT)} synthetic customer rows
        with planted errors. Or drop your own CSV anywhere in this area: comma,
        semicolon, tab or pipe separated, up to {MAX_FILE_BYTES / 1024 / 1024}{' '}
        MB.
      </p>
      <ul
        aria-label="How your data is handled"
        className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3"
      >
        {FACTS.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-2.5 text-sm">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{title}</span>
              <span className="text-text-secondary">{text}</span>
            </div>
          </li>
        ))}
      </ul>
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
    text: 'Every change is a suggestion you accept, edit or reject. The original file is never modified.',
  },
];

const welcomeScreen = tv({
  base: 'flex flex-col items-start gap-4 rounded-lg border border-dashed p-6 transition-colors sm:p-8',
  variants: {
    isDragging: {
      true: 'border-primary bg-muted',
      false: 'border-border bg-surface',
    },
  },
});
