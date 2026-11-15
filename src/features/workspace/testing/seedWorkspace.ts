import { runChecks } from '@/engine/checks/runChecks';
import type { Dataset } from '@/engine/dataset/dataset';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { analysisActions, analysisStore$ } from '../state/analysisStore';
import { exportActions } from '../state/exportStore';
import { previewActions } from '../state/previewStore';
import { reviewActions } from '../state/reviewStore';
import { workspaceStore$ } from '../state/workspaceStore';

// Loads the CSV lines into the stores as a finished load and analysis, with the real checks.
export function seedWorkspace(...lines: string[]): Dataset {
  const dataset = toDataset(...lines);
  const profile = profileDataset(dataset);
  const issues = runChecks({ dataset, profile });

  analysisActions.reset();
  reviewActions.reset();
  previewActions.reset();
  exportActions.reset();
  workspaceStore$.setState({
    phase: {
      status: 'ready',
      facts: {
        fileName: 'people.csv',
        rowCount: dataset.rows.length,
        columns: dataset.columns,
        format: dataset.format,
      },
      rowChunks: [dataset.rows],
    },
  });
  analysisStore$.setState({
    phase: { status: 'done', result: { profile, issues, candidates: [] } },
  });

  return dataset;
}
