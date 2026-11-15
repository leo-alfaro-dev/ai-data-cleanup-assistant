import { RxReload } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { useIsAiRunning } from '../state/aiStore';
import { rerunAiTasks } from '../state/rerunAiTasks';
import { KeySettings } from './KeySettings';
import { ModelPicker } from './ModelPicker';

export type AiToolbarProps = React.ComponentProps<'div'>;

export function AiToolbar({ className = '', ...props }: AiToolbarProps) {
  const isRunning = useIsAiRunning();

  return (
    <div
      className={twMerge(
        'flex flex-wrap items-center justify-between gap-2',
        className
      )}
      {...props}
    >
      <ModelPicker />
      <div className="flex flex-wrap items-center gap-2">
        <KeySettings />
        <Button disabled={isRunning} onClick={() => void rerunAiTasks()}>
          <RxReload aria-hidden className="size-3.5" />
          Run again
        </Button>
      </div>
    </div>
  );
}
