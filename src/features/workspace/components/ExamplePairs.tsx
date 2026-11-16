import { RxArrowRight } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { VisibleValue } from '@/components/VisibleValue';
import type { PreviewExample } from '@/engine/changes/changePreview';

export type ExamplePairsProps = React.ComponentProps<'ul'> & {
  examples: readonly PreviewExample[];
};

export function ExamplePairs({
  examples,
  className = '',
  ...props
}: ExamplePairsProps) {
  return (
    <ul
      aria-label="Before and after"
      className={twMerge('flex flex-col gap-1.5', className)}
      {...props}
    >
      {examples.map(({ before, after, cells }) => (
        <li
          key={`${before}\u0000${after}`}
          className="flex max-w-full min-w-0 items-center gap-2 font-mono text-xs"
        >
          <VisibleValue
            value={before}
            className="min-w-0 truncate rounded-md border border-border bg-surface px-1.5 py-0.5 text-removed"
          />
          <RxArrowRight
            aria-label="becomes"
            role="img"
            className="size-3.5 shrink-0 text-primary"
          />
          <VisibleValue
            value={after}
            className="min-w-0 truncate rounded-md bg-tint px-1.5 py-0.5 font-medium text-added"
          />
          {cells > 1 && (
            <span className="shrink-0 text-text-secondary tabular-nums">
              × {cells}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
