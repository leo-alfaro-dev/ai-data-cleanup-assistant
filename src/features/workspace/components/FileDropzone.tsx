import { RxUpload } from 'react-icons/rx';
import { tv } from 'tailwind-variants';
import { MAX_FILE_BYTES } from '@/engine/dataset/maxFileBytes';
import { useFileDrop } from '../state/useFileDrop';
import { workspaceActions } from '../state/workspaceStore';

export type FileDropzoneProps = React.ComponentProps<'label'>;

export function FileDropzone({ className = '', ...props }: FileDropzoneProps) {
  const { isDragging, handlers } = useFileDrop();

  return (
    <label
      className={fileDropzone({ isDragging, className })}
      {...handlers}
      {...props}
    >
      <RxUpload aria-hidden className="size-5 text-text-secondary" />
      <span className="text-sm font-medium">
        Drop a CSV file here, or{' '}
        <span className="underline underline-offset-4">choose one</span>
      </span>
      <span className="text-xs text-text-secondary">
        Comma, semicolon, tab or pipe separated · up to{' '}
        {MAX_FILE_BYTES / 1024 / 1024} MB
      </span>
      <input
        type="file"
        aria-label="Choose a CSV file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void workspaceActions.loadFile(file);
        }}
      />
    </label>
  );
}

const fileDropzone = tv({
  base: 'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary',
  variants: {
    isDragging: {
      true: 'border-primary bg-muted',
      false: 'border-border bg-surface hover:bg-muted',
    },
  },
});
