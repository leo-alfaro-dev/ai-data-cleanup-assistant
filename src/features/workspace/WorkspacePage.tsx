'use client';

import { twMerge } from 'tailwind-variants';
import { ExportDialog } from './components/ExportDialog';
import { FileDropzone } from './components/FileDropzone';
import { LoadFailure } from './components/LoadFailure';
import { LoadProgress } from './components/LoadProgress';
import { Masthead } from './components/Masthead';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { ShortcutHelp } from './components/ShortcutHelp';
import { TransparencyPanel } from './components/TransparencyPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
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
        className={twMerge(
          'flex h-dvh flex-col overflow-hidden bg-canvas',
          className
        )}
        {...props}
      >
        <WorkspaceHeader />
        <ReviewWorkspace />
        <ExportDialog />
        <TransparencyPanel />
        <ShortcutHelp />
      </main>
    );
  }

  return (
    <main className={twMerge('flex flex-1 flex-col', className)} {...props}>
      <Masthead />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        {phase.status === 'empty' && <WelcomeScreen className="flex-1" />}
        {phase.status === 'loading' && (
          <LoadProgress
            className="mx-auto w-full max-w-xl"
            fileName={phase.fileName}
            stage={phase.stage}
            percentage={phase.percentage}
          />
        )}
        {phase.status === 'failed' && (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <LoadFailure fileName={phase.fileName} reason={phase.reason} />
            <FileDropzone />
          </div>
        )}
      </div>
    </main>
  );
}
