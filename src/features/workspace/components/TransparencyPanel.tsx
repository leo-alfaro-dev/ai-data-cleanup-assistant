import { Accordion } from 'radix-ui';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-variants';
import { Modal } from '@/components/Modal';
import { countOf } from '@/lib/countOf';
import { formatCost } from '@/lib/formatCost';
import { formatLatency } from '@/lib/formatLatency';
import { formatTokens } from '@/lib/formatTokens';
import { useAiCalls } from '../state/aiStore';
import { summarizeAiCalls } from '../state/summarizeAiCalls';
import {
  transparencyActions,
  useIsTransparencyOpen,
} from '../state/transparencyStore';
import { AiCallItem } from './AiCallItem';

export type TransparencyPanelProps = Omit<
  React.ComponentProps<typeof Modal>,
  'isOpen' | 'title' | 'description' | 'onClose' | 'children'
>;

export function TransparencyPanel({
  className = '',
  ...props
}: TransparencyPanelProps) {
  const isOpen = useIsTransparencyOpen();
  const calls = useAiCalls();
  const { callCount, tokens, cost, latencyMs, claimCount, droppedClaims } =
    useMemo(() => summarizeAiCalls(calls), [calls]);

  return (
    <Modal
      isOpen={isOpen}
      title="What was sent to the AI"
      description="Every request of this file, as the browser sent it, and what each cost."
      className={twMerge('max-w-3xl', className)}
      onClose={() => transparencyActions.close()}
      {...props}
    >
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
        <dt className="text-text-secondary">Model calls</dt>
        <dd className="text-right font-medium">
          {countOf({ count: callCount, noun: 'call' })}
        </dd>
        <dt className="text-text-secondary">Tokens</dt>
        <dd className="text-right font-medium">{formatTokens(tokens)}</dd>
        <dt className="text-text-secondary">Cost</dt>
        <dd className="text-right font-medium">{formatCost(cost)}</dd>
        <dt className="text-text-secondary">
          Model time, calls added together
        </dt>
        <dd className="text-right font-medium">{formatLatency(latencyMs)}</dd>
        <dt className="text-text-secondary">Claims left out</dt>
        <dd className="text-right font-medium">
          {droppedClaims} of {claimCount}
        </dd>
      </dl>
      {calls.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nothing has been sent yet.
        </p>
      )}
      {calls.length > 0 && (
        <Accordion.Root type="multiple" className="flex flex-col gap-2">
          {calls.map((entry) => (
            <AiCallItem key={entry.key} entry={entry} />
          ))}
        </Accordion.Root>
      )}
    </Modal>
  );
}
