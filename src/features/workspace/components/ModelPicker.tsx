import { twMerge } from 'tailwind-variants';
import { AI_MODELS, isAiModelId } from '@/ai/models';
import { Select } from '@/components/Select';
import { useIsAiRunning } from '../state/aiStore';
import { settingsActions, useModelId } from '../state/settingsStore';

export type ModelPickerProps = React.ComponentProps<'label'>;

export function ModelPicker({ className = '', ...props }: ModelPickerProps) {
  const modelId = useModelId();
  const isRunning = useIsAiRunning();

  return (
    <label className={twMerge('flex min-w-0', className)} {...props}>
      <span className="sr-only">Model</span>
      <Select
        value={modelId}
        disabled={isRunning}
        className="w-full pr-6"
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
      </Select>
    </label>
  );
}
