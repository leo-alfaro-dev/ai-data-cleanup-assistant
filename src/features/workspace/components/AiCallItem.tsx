import { Accordion } from 'radix-ui';
import { RxChevronDown } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { AI_MODELS } from '@/ai/models';
import { eyebrow } from '@/components/eyebrow';
import { countOf } from '@/lib/countOf';
import { formatCost } from '@/lib/formatCost';
import { formatLatency } from '@/lib/formatLatency';
import { formatTokens } from '@/lib/formatTokens';
import { aiFailureCopy } from '../aiFailureCopy';
import { aiTaskLabels } from '../aiTaskLabels';
import type { AiCallEntry } from '../state/aiCallEntry';
import { summarizeAiCalls } from '../state/summarizeAiCalls';
import { AiAvatar } from './AiAvatar';

export type AiCallItemProps = Omit<
  React.ComponentProps<typeof Accordion.Item>,
  'value'
> & {
  entry: AiCallEntry;
};

export function AiCallItem({
  entry,
  className = '',
  ...props
}: AiCallItemProps) {
  const { tokens, cost, latencyMs } = summarizeAiCalls([entry]);
  const model =
    AI_MODELS.find(({ id }) => id === entry.model)?.label ?? entry.model;

  return (
    <Accordion.Item
      value={entry.key}
      className={twMerge(
        'rounded-xl border border-border bg-surface transition-colors data-[state=open]:border-border-strong',
        className
      )}
      {...props}
    >
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
          <span className="flex min-w-0 items-center gap-2.5">
            <AiAvatar className="max-sm:hidden" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{aiTaskLabels[entry.task]}</span>
              <span className="text-xs text-text-secondary">
                {model} ·{' '}
                {entry.outcome === 'ok'
                  ? 'Answered'
                  : aiFailureCopy[entry.outcome]}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary tabular-nums">
            {formatTokens(tokens)} tokens · {formatCost(cost)} ·{' '}
            {formatLatency(latencyMs)}
            <RxChevronDown aria-hidden className="size-4" />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="flex flex-col gap-2 px-3 pb-3">
        {entry.claimCount !== null && entry.droppedClaims !== null && (
          <p className="text-sm text-text-secondary">
            {entry.droppedClaims === 0
              ? `${countOf({ count: entry.claimCount, noun: 'claim' })} made, none left out.`
              : `${entry.droppedClaims} of ${countOf({ count: entry.claimCount, noun: 'claim' })} were left out: they cited rows or values that were not sent, or failed validation.`}
          </p>
        )}
        <p className={eyebrow()}>Request, exactly as sent</p>
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-canvas p-3 font-mono text-xs break-words whitespace-pre-wrap">
          {entry.requestBody}
        </pre>
      </Accordion.Content>
    </Accordion.Item>
  );
}
