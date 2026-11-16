import { RxFileText } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import type { Delimiter } from '@/engine/dataset/dataset';
import { countOf } from '@/lib/countOf';
import { useFacts } from '../state/workspaceStore';

export type DatasetFactsProps = React.ComponentProps<'section'>;

export function DatasetFacts({ className = '', ...props }: DatasetFactsProps) {
  const facts = useFacts();
  const isUtf8 = facts.format.encoding === 'utf-8';

  return (
    <section
      aria-label="Loaded file"
      className={twMerge('flex min-w-0 flex-col gap-0.5', className)}
      {...props}
    >
      <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
        <RxFileText aria-hidden className="size-4 shrink-0 text-primary" />
        <span className="truncate">{facts.fileName}</span>
      </h2>
      <p className="text-xs text-text-secondary tabular-nums">
        {countOf({ count: facts.rowCount, noun: 'row' })} ×{' '}
        {countOf({ count: facts.columns.length, noun: 'column' })} ·{' '}
        {delimiterCopy[facts.format.delimiter]}-separated
        {!isUtf8 && ' · Not UTF-8: read as Windows-1252.'}
      </p>
    </section>
  );
}

const delimiterCopy: Record<Delimiter, string> = {
  ',': 'Comma',
  ';': 'Semicolon',
  '\t': 'Tab',
  '|': 'Pipe',
};
