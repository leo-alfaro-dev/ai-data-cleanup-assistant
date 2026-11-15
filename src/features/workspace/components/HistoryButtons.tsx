import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { ariaKeysOf } from '../shortcuts';
import { reviewActions, useCanRedo, useCanUndo } from '../state/reviewStore';
import { ShortcutHint } from './ShortcutHint';

export type HistoryButtonsProps = React.ComponentProps<'div'>;

export function HistoryButtons({
  className = '',
  ...props
}: HistoryButtonsProps) {
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div
      role="group"
      aria-label="Decision history"
      className={twMerge('flex items-center gap-1', className)}
      {...props}
    >
      <Button
        variant="ghost"
        disabled={!canUndo}
        aria-keyshortcuts={ariaKeysOf('undo')}
        onClick={() => reviewActions.undo()}
      >
        Undo
        <ShortcutHint action="undo" />
      </Button>
      <Button
        variant="ghost"
        disabled={!canRedo}
        aria-keyshortcuts={ariaKeysOf('redo')}
        onClick={() => reviewActions.redo()}
      >
        Redo
        <ShortcutHint action="redo" />
      </Button>
    </div>
  );
}
