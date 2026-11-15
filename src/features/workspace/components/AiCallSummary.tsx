import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { countOf } from '@/lib/countOf';
import { formatCost } from '@/lib/formatCost';
import { formatTokens } from '@/lib/formatTokens';
import { useAiCalls } from '../state/aiStore';
import { summarizeAiCalls } from '../state/summarizeAiCalls';
import { transparencyActions } from '../state/transparencyStore';

export type AiCallSummaryProps = Omit<
  React.ComponentProps<typeof Button>,
  'onClick' | 'children'
>;

export function AiCallSummary({
  className = '',
  ...props
}: AiCallSummaryProps) {
  const calls = useAiCalls();
  const { callCount, tokens, cost } = useMemo(
    () => summarizeAiCalls(calls),
    [calls]
  );

  return (
    <Button
      variant="ghost"
      className={twMerge('tabular-nums', className)}
      onClick={() => transparencyActions.open()}
      {...props}
    >
      {countOf({ count: callCount, noun: 'AI call' })} · {formatTokens(tokens)}{' '}
      tokens · {formatCost(cost)}
    </Button>
  );
}
