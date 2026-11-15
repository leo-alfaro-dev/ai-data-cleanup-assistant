'use client';

import { twMerge } from 'tailwind-variants';
import { ExportDialog } from './components/ExportDialog';
import { FileDropzone } from './components/FileDropzone';
import { LoadFailure } from './components/LoadFailure';
import { LoadProgress } from './components/LoadProgress';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { useWorkspacePhase } from './state/workspaceStore';

export type WorkspacePageProps = React.ComponentProps<'main'>;

export function WorkspacePage({
  className = '',
  ...props
}: WorkspacePageProps) {
  const phase = useWorkspacePhase();

  if (phase.status === 'ready') {
    return (
      <main
        className={twMerge('flex h-dvh flex-col overflow-hidden', className)}
        {...props}
      >
        <WorkspaceHeader className="border-b border-border bg-surface px-3 py-2" />
        <ReviewWorkspace />
        <ExportDialog />
      </main>
    );
  }

  return (
    <main
      className={twMerge(
        'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-2">
        <WorkspaceHeader />
        <p className="max-w-prose text-sm text-text-secondary">
          Finds duplicates, inconsistent values, missing data and suspicious
          records in a CSV, and lets you decide what changes.
        </p>
      </div>
      {phase.status === 'empty' && <FileDropzone />}
      {phase.status === 'loading' && (
        <LoadProgress
          fileName={phase.fileName}
          stage={phase.stage}
          percentage={phase.percentage}
        />
      )}
      {phase.status === 'failed' && (
        <div className="flex flex-col gap-4">
          <LoadFailure fileName={phase.fileName} reason={phase.reason} />
          <FileDropzone />
        </div>
      )}
    </main>
  );
}
