import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/engine/analysis/analysisResult';
import type { Row } from '@/engine/dataset/dataset';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { Recipe } from '@/engine/recipe/recipe';
import type { ReplayResult } from '@/engine/recipe/replayResult';
import { recipeStore$ } from './recipeStore';
import { reviewStore$ } from './reviewStore';
import { workspaceActions, workspaceStore$ } from './workspaceStore';

const { worker } = vi.hoisted(() => ({
  worker: {
    load: vi.fn(),
    rows: vi.fn(),
    analyze: vi.fn(),
    buildAiRequests: vi.fn(),
    replayRecipe: vi.fn(),
    preview: vi.fn(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

const recipe: Recipe = {
  version: 1,
  createdAt: '2026-01-02T03:04:05.000Z',
  source: { fileName: 'last.csv', rowCount: 2, columns: ['name'] },
  rules: [
    { kind: 'trimWhitespace', column: { header: 'name', occurrence: 1 } },
  ],
};

const replayed: Issue = {
  id: toIssueId('recipe:0'),
  category: 'inconsistent',
  source: 'recipe',
  confidence: 'certain',
  rows: [],
  column: toColumnKey(0),
  suggestion: { kind: 'trimWhitespace', column: toColumnKey(0) },
  details: { kind: 'recipeRule' },
};

const replayResult: ReplayResult = {
  issues: [replayed],
  skipped: [],
  cellsChanged: 4,
  rowsRemoved: 0,
};

const facts: FileFacts = {
  fileName: 'next.csv',
  rowCount: 2,
  columns: [{ key: toColumnKey(0), header: 'name' }],
  format: {
    delimiter: ',',
    lineBreak: '\n',
    hasByteOrderMark: false,
    encoding: 'utf-8',
  },
};

const analysis: AnalysisResult = { profile: [], issues: [], candidates: [] };

function recipeFile(text = JSON.stringify(recipe), name = 'last.recipe.json') {
  return new File([text], name, { type: 'application/json' });
}

const csv = () => new File(['name\nAda'], 'next.csv', { type: 'text/csv' });
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('applying a recipe while loading a file', () => {
  beforeEach(() => {
    workspaceActions.reset();
    for (const method of Object.values(worker)) method.mockReset();
    worker.load.mockReturnValue(CancelablePromise.resolve({ ok: true, facts }));
    worker.rows.mockReturnValue(
      CancelablePromise.resolve<Row[]>([['Ada'], ['Bo']])
    );
    worker.analyze.mockReturnValue(CancelablePromise.resolve(analysis));
    worker.buildAiRequests.mockReturnValue(CancelablePromise.resolve(null));
    worker.replayRecipe.mockReturnValue(
      CancelablePromise.resolve(replayResult)
    );
  });

  it('replays the waiting recipe on the loaded file, accepts its rules as one step and asks the AI for nothing', async () => {
    await recipeStore$.actions.chooseRecipe(recipeFile());
    expect(recipeStore$.getState().pending).toMatchObject({
      fileName: 'last.recipe.json',
    });

    await workspaceActions.loadFile(csv());
    await settle();

    expect(worker.replayRecipe).toHaveBeenCalledExactlyOnceWith(recipe);
    expect(worker.buildAiRequests).not.toHaveBeenCalled();
    expect(reviewStore$.getState().decisions.get(replayed.id)).toEqual({
      status: 'accepted',
    });
    expect(reviewStore$.getState().undoStack).toHaveLength(1);
    expect(recipeStore$.getState()).toMatchObject({
      pending: null,
      result: { fileName: 'last.recipe.json', cellsChanged: 4 },
    });
  });

  it('runs the AI as usual when no recipe is waiting', async () => {
    await workspaceActions.loadFile(csv());
    await settle();

    expect(worker.replayRecipe).not.toHaveBeenCalled();
    expect(worker.buildAiRequests).toHaveBeenCalledOnce();
    expect(recipeStore$.getState().result).toBeNull();
  });

  it('forgets the result of a recipe when another file is loaded', async () => {
    await recipeStore$.actions.chooseRecipe(recipeFile());
    await workspaceActions.loadFile(csv());
    await settle();

    await workspaceActions.loadFile(csv());
    await settle();

    expect(recipeStore$.getState().result).toBeNull();
    expect(reviewStore$.getState().decisions.size).toBe(0);
  });

  it('takes the recipe and the file from one drop, the recipe first', async () => {
    await workspaceActions.loadFiles([csv(), recipeFile()]);
    await settle();

    expect(worker.replayRecipe).toHaveBeenCalledOnce();
    expect(workspaceStore$.getState().phase.status).toBe('ready');
  });

  it('keeps a dropped recipe waiting when no file comes with it', async () => {
    await workspaceActions.loadFiles([recipeFile()]);

    expect(worker.load).not.toHaveBeenCalled();
    expect(recipeStore$.getState().pending).not.toBeNull();
    expect(workspaceStore$.getState().phase.status).toBe('empty');
  });

  it.each([
    ['not JSON', 'nope', 'notJson'],
    ['not a recipe', '{"rules":[]}', 'invalidRecipe'],
    ['of another version', '{"version":9}', 'unsupportedVersion'],
  ])(
    'rejects a file that is %s and applies nothing',
    async (_name, text, reason) => {
      await recipeStore$.actions.chooseRecipe(recipeFile(text, 'bad.json'));
      await workspaceActions.loadFile(csv());
      await settle();

      expect(recipeStore$.getState().rejection).toEqual({
        fileName: 'bad.json',
        reason,
      });
      expect(worker.replayRecipe).not.toHaveBeenCalled();
      expect(worker.buildAiRequests).toHaveBeenCalledOnce();
    }
  );

  it('drops the waiting recipe when the workspace is reset', async () => {
    await recipeStore$.actions.chooseRecipe(recipeFile());

    workspaceActions.reset();

    expect(recipeStore$.getState().pending).toBeNull();
  });

  it('lands nothing from a replay whose file was replaced while the answer was held', async () => {
    const held = defer<ReplayResult | null>();
    worker.replayRecipe.mockReturnValueOnce(held.promise);
    await recipeStore$.actions.chooseRecipe(recipeFile());
    await workspaceActions.loadFile(csv());
    await settle();

    await workspaceActions.loadFile(csv());
    held.resolve(replayResult);
    await settle();

    expect(recipeStore$.getState().result).toBeNull();
    expect(reviewStore$.getState().decisions.size).toBe(0);
  });

  it('says so when the replay fails, and leaves the AI off', async () => {
    worker.replayRecipe.mockReturnValueOnce(CancelablePromise.resolve(null));
    await recipeStore$.actions.chooseRecipe(recipeFile());

    await workspaceActions.loadFile(csv());
    await settle();

    expect(recipeStore$.getState().hasReplayFailed).toBe(true);
    expect(worker.buildAiRequests).not.toHaveBeenCalled();
  });

  it('does not load the file dropped with a recipe that was refused', async () => {
    await workspaceActions.loadFiles([csv(), recipeFile('nope', 'bad.json')]);

    expect(worker.load).not.toHaveBeenCalled();
    expect(recipeStore$.getState().rejection?.reason).toBe('notJson');
  });

  it('loads a file dropped alone even after a recipe was refused earlier', async () => {
    await recipeStore$.actions.chooseRecipe(recipeFile('nope', 'bad.json'));

    await workspaceActions.loadFiles([csv()]);
    await settle();

    expect(worker.load).toHaveBeenCalledOnce();
  });
});
