import { twMerge } from 'tailwind-variants';
import { Kbd } from '@/components/Kbd';
import type { ShortcutAction } from '../shortcuts';
import { displayOf } from '../shortcuts';

export type ShortcutHintProps = Omit<
  React.ComponentProps<typeof Kbd>,
  'children'
> & {
  action: ShortcutAction;
};

// Hidden from assistive technology: the button's `aria-keyshortcuts` says it there.
export function ShortcutHint({
  action,
  className = '',
  ...props
}: ShortcutHintProps) {
  return (
    <Kbd
      aria-hidden
      className={twMerge('hidden sm:inline-flex', className)}
      {...props}
    >
      {displayOf(action)}
    </Kbd>
  );
}
