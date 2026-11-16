import { Accordion } from 'radix-ui';
import { useMemo } from 'react';
import { RxEyeOpen } from 'react-icons/rx';
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
import { StatTile } from './StatTile';

export type TransparencyPanelProps = Omit<
  React.ComponentProps<typeof Modal>,
  'isOpen' | 'title' | 'icon' | 'description' | 'onClose' | 'children'
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
      icon={RxEyeOpen}
      className={twMerge('max-w-3xl', className)}
      onClose={() => transparencyActions.close()}
      {...props}
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile tone="solid" label="Model calls">
          {countOf({ count: callCount, noun: 'call' })}
        </StatTile>
        <StatTile tone="tint" label="Cost">
          {formatCost(cost)}
        </StatTile>
        <StatTile label="Tokens">{formatTokens(tokens)}</StatTile>
        <StatTile label="Model time, calls added together">
          {formatLatency(latencyMs)}
        </StatTile>
        <StatTile label="Claims left out">
          {droppedClaims} of {claimCount}
        </StatTile>
      </dl>
      {calls.length === 0 && (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-text-secondary">
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
