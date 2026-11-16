import type { IconType } from 'react-icons';
import { RxDownload, RxFileText, RxListBullet } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { IconCircle } from '@/components/IconCircle';
import { Modal } from '@/components/Modal';
import { countOf } from '@/lib/countOf';
import { downloadFile } from '../downloadFile';
import { exportActions, useExportPhase } from '../state/exportStore';
import { useFacts } from '../state/workspaceStore';
import { toExportFileName } from '../toExportFileName';
import { FailureNote } from './FailureNote';
import { StatTile } from './StatTile';

export type ExportDialogProps = Omit<
  React.ComponentProps<typeof Modal>,
  | 'isOpen'
  | 'title'
  | 'icon'
  | 'description'
  | 'isCloseDisabled'
  | 'onClose'
  | 'children'
>;

export function ExportDialog({ className = '', ...props }: ExportDialogProps) {
  const phase = useExportPhase();
  const { fileName } = useFacts();
  const isRunning = phase.status === 'running';
  const isReady = phase.status === 'ready';
  const download = (file: ExportFile) => {
    if (phase.status !== 'ready') return;

    downloadFile({
      name: toExportFileName({ fileName, suffix: file.suffix }),
      text: phase.files[file.content],
    });
  };

  return (
    <Modal
      isOpen={phase.status !== 'closed'}
      title="Export"
      description="Download the cleaned file and a log of every change."
      icon={RxDownload}
      isCloseDisabled={isRunning}
      onClose={() => exportActions.close()}
      className={twMerge('max-w-xl', className)}
      {...props}
    >
      {isRunning && (
        <p aria-live="polite" className="text-sm text-text-secondary">
          Preparing the files.
        </p>
      )}
      {phase.status === 'failed' && (
        <FailureNote>
          The files could not be prepared. Close this dialog and try again.
        </FailureNote>
      )}
      {phase.status === 'ready' && (
        <dl className="grid gap-2 sm:grid-cols-3">
          <StatTile tone="solid" label="Cells changed">
            {countOf({ count: phase.files.cellsChanged, noun: 'cell' })}
          </StatTile>
          <StatTile tone="tint" label="Rows removed">
            {countOf({ count: phase.files.rowsRemoved, noun: 'row' })}
          </StatTile>
          <StatTile label="Issues still pending">
            {phase.pendingCount === null
              ? 'Not checked'
              : countOf({ count: phase.pendingCount, noun: 'issue' })}
          </StatTile>
        </dl>
      )}
      {phase.status === 'ready' && (phase.pendingCount ?? 0) > 0 && (
        <p className="text-sm text-text-secondary">
          Pending issues leave the data as it is in the file.
        </p>
      )}
      <ul
        aria-label="Files"
        className="flex flex-col divide-y divide-border rounded-xl border border-border"
      >
        {EXPORT_FILES.map((file) => (
          <li
            key={file.suffix}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <IconCircle icon={file.icon} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-mono text-xs font-medium">
                {toExportFileName({ fileName, suffix: file.suffix })}
              </span>
              <span className="text-xs text-text-secondary">
                {file.description}
              </span>
            </span>
            <Button
              variant={file.isMain ? 'primary' : 'secondary'}
              disabled={!isReady}
              className="col-start-2 justify-self-start sm:col-start-auto"
              onClick={() => download(file)}
            >
              <RxDownload aria-hidden className="size-3.5" />
              {file.action}
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

type ExportFile = {
  suffix: 'cleaned' | 'changes';
  content: 'csv' | 'changeLog';
  icon: IconType;
  action: string;
  description: string;
  isMain: boolean;
};

const EXPORT_FILES: readonly ExportFile[] = [
  {
    suffix: 'cleaned',
    content: 'csv',
    icon: RxFileText,
    action: 'Download cleaned CSV',
    description: 'The file with every applied change.',
    isMain: true,
  },
  {
    suffix: 'changes',
    content: 'changeLog',
    icon: RxListBullet,
    action: 'Download change log',
    description: 'One line for each changed cell and removed row.',
    isMain: false,
  },
];
