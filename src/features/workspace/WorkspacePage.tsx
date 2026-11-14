'use client';

import { twMerge } from 'tailwind-variants';

export type WorkspacePageProps = React.ComponentProps<'main'>;

export function WorkspacePage({
  className = '',
  ...props
}: WorkspacePageProps) {
  return (
    <main
      className={twMerge(
        'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 px-6 py-10',
        className
      )}
      {...props}
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        AI Data Cleanup Assistant
      </h1>
      <p className="max-w-prose text-sm text-text-secondary">
        Finds duplicates, inconsistent values, missing data and suspicious
        records in a CSV, and lets you decide what changes.
      </p>
    </main>
  );
}
