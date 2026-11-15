import { twMerge } from 'tailwind-variants';
import { AI_MODELS, isAiModelId } from '@/ai/models';
import { useIsAiRunning } from '../state/aiStore';
import { settingsActions, useModelId } from '../state/settingsStore';

export type ModelPickerProps = React.ComponentProps<'label'>;

export function ModelPicker({ className = '', ...props }: ModelPickerProps) {
  const modelId = useModelId();
  const isRunning = useIsAiRunning();

  return (
    <label
      className={twMerge(
        'flex items-center gap-2 text-xs text-text-secondary',
        className
      )}
      {...props}
    >
      Model
      <select
        value={modelId}
        disabled={isRunning}
        className="h-8 min-w-0 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          const chosen = event.target.value;
          if (isAiModelId(chosen)) settingsActions.selectModel(chosen);
        }}
      >
        {AI_MODELS.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
