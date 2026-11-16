import { useMemo } from 'react';
import { RxReader } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { BackdropIcon } from '@/components/BackdropIcon';
import { eyebrow } from '@/components/eyebrow';
import { countOf } from '@/lib/countOf';
import { describeRecipeRule, skippedRuleCopy } from '../recipeCopy';
import { useAiCalls } from '../state/aiStore';
import type { RecipeResult } from '../state/recipeStore';
import { summarizeAiCalls } from '../state/summarizeAiCalls';
import { StatTile } from './StatTile';

export type RecipeReportProps = React.ComponentProps<'section'> & {
  result: RecipeResult;
};

export function RecipeReport({
  result,
  className = '',
  ...props
}: RecipeReportProps) {
  const calls = useAiCalls();
  const { callCount } = useMemo(() => summarizeAiCalls(calls), [calls]);

  return (
    <section
      aria-label="Recipe"
      className={twMerge(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-3 text-sm shadow-xs',
        className
      )}
      {...props}
    >
      <BackdropIcon icon={RxReader} className="-top-4 -right-5 size-24" />
      <div className="relative flex flex-col gap-0.5">
        <p className={eyebrow()}>Recipe applied</p>
        <p className="truncate font-semibold">{result.fileName}</p>
      </div>
      <dl className="relative grid grid-cols-2 gap-2">
        <StatTile tone="solid" label="Rules applied">
          {result.issues.length}
        </StatTile>
        <StatTile tone="tint" label="Rules skipped">
          {result.skipped.length}
        </StatTile>
        <StatTile label="Cells changed">{result.cellsChanged}</StatTile>
        <StatTile label="Rows removed">{result.rowsRemoved}</StatTile>
      </dl>
      <p className="relative text-text-secondary">
        {countOf({ count: callCount, noun: 'AI call' })}
      </p>
      {result.skipped.length > 0 && (
        <ul
          aria-label="Skipped rules"
          className="relative flex flex-col gap-1 border-t border-border pt-2"
        >
          {result.skipped.map(({ index, rule, reason }) => (
            <li key={index} className="text-xs text-text-secondary">
              {describeRecipeRule(rule)}: {skippedRuleCopy[reason]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
