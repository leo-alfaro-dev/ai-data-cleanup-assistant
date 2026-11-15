import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { listNameColumns } from './listNameColumns';

function list(dataset: Dataset) {
  return listNameColumns({ dataset, profile: profileDataset(dataset) });
}

describe('listNameColumns', () => {
  it('takes a first and a last name column in column order', () => {
    const dataset = toDataset(
      'last_name,city,first_name',
      'Lovelace,London,Ada',
      'Turing,Leeds,Alan'
    );

    expect(list(dataset)).toEqual([toColumnKey(0), toColumnKey(2)]);
  });

  it('takes a single name column', () => {
    const dataset = toDataset('customer_name,city', 'Ada Lovelace,London');

    expect(list(dataset)).toEqual([toColumnKey(0)]);
  });

  it('finds no name column when no header names a person', () => {
    const dataset = toDataset('state_name,plan_name', 'Texas,Pro', 'Ohio,Free');

    expect(list(dataset)).toEqual([]);
  });

  it('leaves out a name-like column that does not hold text', () => {
    const dataset = toDataset('name,first_name', '1,Ada', '2,Alan', '3,Grace');

    expect(list(dataset)).toEqual([toColumnKey(1)]);
  });

  it('keeps the two columns with the most distinct values when more qualify', () => {
    const dataset = toDataset(
      'middle_name,first_name,last_name',
      'Q,Ada,Lovelace',
      'Q,Alan,Turing',
      'Q,Grace,Hopper',
      'R,Ada,Byron'
    );

    expect(list(dataset)).toEqual([toColumnKey(1), toColumnKey(2)]);
  });

  it('breaks a tie in distinct values by column position', () => {
    const dataset = toDataset(
      'given_name,family_name,surname',
      'Ada,Lovelace,Lovelace',
      'Alan,Turing,Turing'
    );

    expect(list(dataset)).toEqual([toColumnKey(0), toColumnKey(1)]);
  });
});
