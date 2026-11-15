import { RxDownload } from 'react-icons/rx';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { countOf } from '@/lib/countOf';
import { downloadFile } from '../downloadFile';
import { exportActions, useExportPhase } from '../state/exportStore';
import { useFacts } from '../state/workspaceStore';
import { toExportFileName } from '../toExportFileName';

export type ExportDialogProps = Omit<
  React.ComponentProps<typeof Modal>,
  | 'isOpen'
  | 'title'
  | 'description'
  | 'isCloseDisabled'
  | 'onClose'
  | 'children'
>;

export function ExportDialog(props: ExportDialogProps) {
  const phase = useExportPhase();
  const { fileName } = useFacts();
  const isRunning = phase.status === 'running';

  return (
    <Modal
      isOpen={phase.status !== 'closed'}
      title="Export"
      description="Download the cleaned file and a log of every change."
      isCloseDisabled={isRunning}
      onClose={() => exportActions.close()}
      {...props}
    >
      {isRunning && (
        <p aria-live="polite" className="text-sm text-text-secondary">
          Preparing the files.
        </p>
      )}
      {phase.status === 'failed' && (
        <p role="alert" className="text-sm text-danger">
          The files could not be prepared. Close this dialog and try again.
        </p>
      )}
      {phase.status === 'ready' && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
          <dt className="text-text-secondary">Cells changed</dt>
          <dd className="text-right font-medium">
            {countOf({ count: phase.files.cellsChanged, noun: 'cell' })}
          </dd>
          <dt className="text-text-secondary">Rows removed</dt>
          <dd className="text-right font-medium">
            {countOf({ count: phase.files.rowsRemoved, noun: 'row' })}
          </dd>
          <dt className="text-text-secondary">Issues still pending</dt>
          <dd className="text-right font-medium">
            {phase.pendingCount === null
              ? 'Not checked'
              : countOf({ count: phase.pendingCount, noun: 'issue' })}
          </dd>
        </dl>
      )}
      {phase.status === 'ready' && (phase.pendingCount ?? 0) > 0 && (
        <p className="text-sm text-text-secondary">
          Pending issues leave the data as it is in the file.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="primary"
          disabled={phase.status !== 'ready'}
          onClick={() =>
            phase.status === 'ready' &&
            downloadFile({
              name: toExportFileName({ fileName, suffix: 'cleaned' }),
              text: phase.files.csv,
            })
          }
        >
          <RxDownload aria-hidden className="size-3.5" />
          Download cleaned CSV
        </Button>
        <Button
          disabled={phase.status !== 'ready'}
          onClick={() =>
            phase.status === 'ready' &&
            downloadFile({
              name: toExportFileName({ fileName, suffix: 'changes' }),
              text: phase.files.changeLog,
            })
          }
        >
          <RxDownload aria-hidden className="size-3.5" />
          Download change log
        </Button>
      </div>
    </Modal>
  );
}
