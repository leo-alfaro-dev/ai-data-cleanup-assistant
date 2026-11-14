import type { WorkerProxy } from 'easy-web-worker/createWorker';
import { createWorker } from 'easy-web-worker/createWorker';
import type { DatasetWorker } from './dataset.worker';

export function getDatasetWorker(): WorkerProxy<DatasetWorker> {
  datasetWorker ??= createWorker<DatasetWorker>(
    new Worker(new URL('./dataset.worker.ts', import.meta.url), {
      type: 'module',
    }),
    {
      onWorkerError: (event) =>
        console.error('Dataset worker failed:', event.message),
    }
  );

  return datasetWorker;
}

let datasetWorker: WorkerProxy<DatasetWorker> | null = null;
