import { RxFileText } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import type { Delimiter } from '@/engine/dataset/dataset';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { formatCount } from '@/lib/formatCount';
import { workspaceActions } from '../state/workspaceStore';

export type DatasetFactsProps = React.ComponentProps<'section'> & {
  facts: FileFacts;
};

export function DatasetFacts({
  facts,
  className = '',
  ...props
}: DatasetFactsProps) {
  const isUtf8 = facts.format.encoding === 'utf-8';

  return (
    <section
      aria-label="Loaded file"
      className={twMerge(
        'flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-medium">
          <RxFileText aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{facts.fileName}</span>
        </h2>
        <p className="text-sm text-text-secondary tabular-nums">
          {countOf({ count: facts.rowCount, noun: 'row' })} ×{' '}
          {countOf({ count: facts.columnCount, noun: 'column' })} ·{' '}
          {delimiterCopy[facts.format.delimiter]}-separated
        </p>
        {!isUtf8 && (
          <p className="text-sm text-text-secondary">
            Not UTF-8: read as Windows-1252.
          </p>
        )}
      </div>
      <Button onClick={() => workspaceActions.reset()}>
        Load another file
      </Button>
    </section>
  );
}

const delimiterCopy: Record<Delimiter, string> = {
  ',': 'Comma',
  ';': 'Semicolon',
  '\t': 'Tab',
  '|': 'Pipe',
};

function countOf({ count, noun }: { count: number; noun: string }): string {
  return `${formatCount(count)} ${count === 1 ? noun : `${noun}s`}`;
}
