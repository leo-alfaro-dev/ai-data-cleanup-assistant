import { RxReload } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { useAiRun, useIsAiRunning } from '../state/aiStore';
import { rerunAiTasks } from '../state/rerunAiTasks';
import { AiTasksButton } from './AiTasksButton';
import { KeySettings } from './KeySettings';
import { ModelPicker } from './ModelPicker';

export type AiToolbarProps = React.ComponentProps<'div'>;

export function AiToolbar({ className = '', ...props }: AiToolbarProps) {
  const isRunning = useIsAiRunning();
  const hasAiTasks = (useAiRun()?.jobs.length ?? 0) > 0;

  return (
    <div
      className={twMerge('flex items-center gap-1 sm:gap-1.5', className)}
      {...props}
    >
      <ModelPicker />
      <KeySettings className="ml-auto px-3" />
      {hasAiTasks && <AiTasksButton />}
      <Button
        variant="ghost"
        aria-label="Run again"
        title="Run again"
        disabled={isRunning}
        className="w-8 px-0"
        onClick={() => void rerunAiTasks()}
      >
        <RxReload aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}
