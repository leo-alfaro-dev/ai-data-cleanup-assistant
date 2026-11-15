export type WorkspacePanel = 'issues' | 'data';

export const WORKSPACE_PANELS: readonly WorkspacePanel[] = ['issues', 'data'];

export function toTabId(panel: WorkspacePanel): string {
  return `workspace-tab-${panel}`;
}

export function toPanelId(panel: WorkspacePanel): string {
  return `workspace-panel-${panel}`;
}
