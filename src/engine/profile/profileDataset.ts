import type { Dataset } from '@/engine/dataset/dataset';
import type { ColumnProfile } from './columnProfile';
import { profileColumn } from './profileColumn';

export function profileDataset(dataset: Dataset): ColumnProfile[] {
  return dataset.columns.map(({ key }) =>
    profileColumn({ dataset, column: key })
  );
}
