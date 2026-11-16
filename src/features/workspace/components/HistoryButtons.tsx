import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { reviewActions, useCanRedo, useCanUndo } from '../state/reviewStore';
import { ShortcutTooltip } from './ShortcutTooltip';

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
      <ShortcutTooltip action="undo">
        <Button
          variant="ghost"
          disabled={!canUndo}
          onClick={() => reviewActions.undo()}
        >
          Undo
        </Button>
      </ShortcutTooltip>
      <ShortcutTooltip action="redo">
        <Button
          variant="ghost"
          disabled={!canRedo}
          onClick={() => reviewActions.redo()}
        >
          Redo
        </Button>
      </ShortcutTooltip>
    </div>
  );
}
