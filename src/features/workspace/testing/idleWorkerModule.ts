// A worker whose calls never settle, for specs that only need the stores not to fail.
export const idleWorkerModule = {
  getDatasetWorker: () => ({
    preview: idleCall,
    analyze: idleCall,
    exportFiles: idleCall,
  }),
};

function idleCall() {
  return {
    status: 'pending',
    cancel() {},
    onProgress() {
      return this;
    },
    then() {},
  };
}
