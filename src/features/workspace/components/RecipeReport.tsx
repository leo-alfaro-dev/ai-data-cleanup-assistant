import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { countOf } from '@/lib/countOf';
import { describeRecipeRule, skippedRuleCopy } from '../recipeCopy';
import { useAiCalls } from '../state/aiStore';
import type { RecipeResult } from '../state/recipeStore';
import { summarizeAiCalls } from '../state/summarizeAiCalls';

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
        'flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm',
        className
      )}
      {...props}
    >
      <p className="font-medium">Recipe applied: {result.fileName}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
        <dt className="text-text-secondary">Rules applied</dt>
        <dd className="text-right font-medium">{result.issues.length}</dd>
        <dt className="text-text-secondary">Rules skipped</dt>
        <dd className="text-right font-medium">{result.skipped.length}</dd>
        <dt className="text-text-secondary">Cells changed</dt>
        <dd className="text-right font-medium">{result.cellsChanged}</dd>
        <dt className="text-text-secondary">Rows removed</dt>
        <dd className="text-right font-medium">{result.rowsRemoved}</dd>
      </dl>
      <p className="text-text-secondary">
        {countOf({ count: callCount, noun: 'AI call' })}
      </p>
      {result.skipped.length > 0 && (
        <ul aria-label="Skipped rules" className="flex flex-col gap-1">
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
