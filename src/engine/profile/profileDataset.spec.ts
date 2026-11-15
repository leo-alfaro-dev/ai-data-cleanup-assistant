import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import { profileColumn } from './profileColumn';
import { profileDataset } from './profileDataset';

describe('profileDataset', () => {
  it('returns one profile per column, in column order', () => {
    const dataset = toDataset(
      'name,age,joined',
      'Ada,36,2024-01-05',
      'Bo,41,2024-02-06',
      'Cy,29,2024-03-07'
    );

    const profiles = profileDataset(dataset);

    expect(profiles.map(({ column }) => column)).toEqual(
      dataset.columns.map(({ key }) => key)
    );
    expect(profiles.map(({ dominantType }) => dominantType)).toEqual([
      'text',
      'integer',
      'date',
    ]);
  });

  it('gives each profile what profileColumn gives for that column', () => {
    const dataset = toDataset('name,age', 'Ada,36', 'Bo,41', 'Ada,');
    const profiles = profileDataset(dataset);

    dataset.columns.forEach(({ key }, index) => {
      expect(profiles[index]).toEqual(profileColumn({ dataset, column: key }));
    });
  });

  it('profiles columns with empty and repeated headers by position', () => {
    const dataset = toDataset('a,a,', '1,x,', '2,y,');

    expect(
      profileDataset(dataset).map(({ dominantType }) => dominantType)
    ).toEqual(['integer', 'text', 'empty']);
  });

  it('counts the cells that a short row lacks as blank', () => {
    const dataset = toDataset('name,age', 'Ada,36', 'Bo');
    const [, age] = profileDataset(dataset);

    expect(age).toMatchObject({ blankCount: 1, nonBlankCount: 1 });
  });
});
