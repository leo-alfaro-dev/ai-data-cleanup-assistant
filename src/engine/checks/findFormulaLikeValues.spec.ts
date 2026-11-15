import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findFormulaLikeValues } from './findFormulaLikeValues';

describe('findFormulaLikeValues', () => {
  it('flags a formula in a text column', () => {
    const dataset = toDataset('name,note', 'Ada,hi', '=SUM(A1),hi', 'Bo,hi');

    expect(findFormulas(dataset)).toEqual([
      {
        id: toIssueId('formula-like-values:0'),
        category: 'suspicious',
        source: 'check',
        confidence: 'high',
        rows: [1],
        column: 0,
        suggestion: null,
        details: { kind: 'formulaLikeValues', leadingCharacters: ['='] },
      },
    ]);
  });

  it('leaves negative numbers written with a decimal comma', () => {
    const dataset = toDataset(
      'amount;note',
      '-12,5;a',
      '-1.234,50;b',
      '+3,5;c',
      '=1+1;d'
    );

    expect(findFormulas(dataset).map(({ rows }) => rows)).toEqual([[3]]);
  });

  it('leaves negative numbers, plus-prefixed phone numbers and placeholders', () => {
    const dataset = toDataset(
      'amount,phone,note',
      '-12.5,+1 555 0100,-',
      '-3,+44 20 7946 0958,--',
      '+5,+15550100123, - '
    );

    expect(findFormulas(dataset)).toEqual([]);
  });

  it('flags one issue per column, with its rows in order and the leading characters found', () => {
    const dataset = toDataset(
      'a,b',
      '=1+1,ok',
      'ok,@SUM(A1)',
      '@mention,ok',
      '+cmd,ok',
      '=2+2,ok'
    );

    const issues = findFormulas(dataset);

    expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('formula-like-values:0'), rows: [0, 2, 3, 4] },
      { id: toIssueId('formula-like-values:1'), rows: [1] },
    ]);
    expect(issues.map(({ details }) => details)).toEqual([
      { kind: 'formulaLikeValues', leadingCharacters: ['=', '+', '@'] },
      { kind: 'formulaLikeValues', leadingCharacters: ['@'] },
    ]);
  });

  it('flags a formula after padding, a non-breaking space included', () => {
    const dataset = toDataset('a', ' =1+1', ' =1+1', '"\n=1+1"', 'ok');

    expect(findFormulas(dataset)[0]?.rows).toEqual([0, 1, 2]);
  });

  it('finds a formula in a numeric column and leaves the numbers around it', () => {
    const dataset = toDataset(
      'amount,label',
      ...Array.from({ length: 30 }, (_, index) => `-${index + 1},x`),
      '=1+1,x'
    );

    expect(findFormulas(dataset)[0]?.rows).toEqual([30]);
  });

  it('finds nothing in a clean file', () => {
    const dataset = toDataset(
      'name,email,phone',
      'Ada,ada@example.com,555-0100',
      'Bo,bo@example.com,(555) 010-0101'
    );

    expect(findFormulas(dataset)).toEqual([]);
  });

  it('does not read the header', () => {
    const dataset = toDataset('=a,-b', '1,2');

    expect(findFormulas(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findFormulas(toDataset('a', 'x'))).toEqual([]);
  });

  it('reads the missing cells of a short row as empty', () => {
    const dataset = toDataset('a,b', '=1+1', 'x,y');

    expect(findFormulas(dataset)[0]?.rows).toEqual([0]);
  });

  it('reads each row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'a,b,c',
      ...Array.from({ length: rowCount }, (_, index) => `${index},=x,y`)
    );
    const watched = watchRowReads(dataset);

    findFormulaLikeValues.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findFormulas(dataset: Dataset) {
  return findFormulaLikeValues.find({
    dataset,
    profile: profileDataset(dataset),
  });
}
