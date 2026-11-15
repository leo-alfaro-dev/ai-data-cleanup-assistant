import { RxReload } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { useIsAiRunning } from '../state/aiStore';
import { rerunAiTasks } from '../state/rerunAiTasks';
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
      <Button disabled={isRunning} onClick={() => void rerunAiTasks()}>
        <RxReload aria-hidden className="size-3.5" />
        Run again
      </Button>
    </div>
  );
}
