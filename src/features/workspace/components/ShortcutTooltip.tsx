import { Tooltip } from 'radix-ui';
import { useState } from 'react';
import { twMerge } from 'tailwind-variants';
import { Kbd } from '@/components/Kbd';
import type { ShortcutAction } from '../shortcuts';
import { ariaKeysOf, shortcutOf } from '../shortcuts';

export type ShortcutTooltipProps = Omit<
  React.ComponentProps<typeof Tooltip.Content>,
  'children'
> & {
  action: ShortcutAction | null;
  children: React.ReactElement;
};

const OPEN_DELAY_MS = 500;

// Gives its child the action's `aria-keyshortcuts` and a tooltip naming the key.
// With no action the child keeps its place and shows no tooltip.
export function ShortcutTooltip({
  action,
  children,
  className = '',
  ...props
}: ShortcutTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shortcut = action === null ? undefined : shortcutOf(action);

  return (
    <Tooltip.Provider delayDuration={OPEN_DELAY_MS} disableHoverableContent>
      <Tooltip.Root
        open={isOpen && shortcut !== undefined}
        onOpenChange={setIsOpen}
      >
        <Tooltip.Trigger
          asChild
          aria-keyshortcuts={action === null ? undefined : ariaKeysOf(action)}
          onFocus={(event) => {
            // Focus a closing dialog hands back, or code moves after a click, is not a request for help.
            if (!event.target.matches(':focus-visible')) event.preventDefault();
          }}
        >
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            collisionPadding={8}
            className={twMerge(
              'pointer-events-none z-50 flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pr-1 pl-2.5 text-xs font-medium text-text-primary shadow-md shadow-text-primary/10',
              className
            )}
            {...props}
          >
            {shortcut?.label}
            <Kbd aria-hidden>{shortcut?.display}</Kbd>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
