import type { Dataset } from '@/engine/dataset/dataset';

export function watchRowReads(dataset: Dataset): {
  dataset: Dataset;
  reads: string[];
} {
  const reads: string[] = [];
  const rows = new Proxy(dataset.rows, {
    get(target, property, receiver) {
      reads.push(String(property));
      return Reflect.get(target, property, receiver);
    },
  });

  return { dataset: { ...dataset, rows }, reads };
}
