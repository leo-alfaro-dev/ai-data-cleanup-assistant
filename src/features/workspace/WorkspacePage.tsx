'use client';

import { twMerge } from 'tailwind-variants';
import { DatasetFacts } from './components/DatasetFacts';
import { FileDropzone } from './components/FileDropzone';
import { LoadFailure } from './components/LoadFailure';
import { LoadProgress } from './components/LoadProgress';
import { useWorkspacePhase } from './state/workspaceStore';

export type WorkspacePageProps = React.ComponentProps<'main'>;

export function WorkspacePage({
  className = '',
  ...props
}: WorkspacePageProps) {
  const phase = useWorkspacePhase();

  return (
    <main
      className={twMerge(
        'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6',
        className
      )}
      {...props}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          AI Data Cleanup Assistant
        </h1>
        <p className="max-w-prose text-sm text-text-secondary">
          Finds duplicates, inconsistent values, missing data and suspicious
          records in a CSV, and lets you decide what changes.
        </p>
      </header>
      {phase.status === 'empty' && <FileDropzone />}
      {phase.status === 'loading' && (
        <LoadProgress
          fileName={phase.fileName}
          stage={phase.stage}
          percentage={phase.percentage}
        />
      )}
      {phase.status === 'ready' && <DatasetFacts facts={phase.facts} />}
      {phase.status === 'failed' && (
        <div className="flex flex-col gap-4">
          <LoadFailure fileName={phase.fileName} reason={phase.reason} />
          <FileDropzone />
        </div>
      )}
    </main>
  );
}
