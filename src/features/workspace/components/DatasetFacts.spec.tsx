import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { DatasetFacts } from './DatasetFacts';

describe('DatasetFacts', () => {
  it('shows the file name, its size and its delimiter', () => {
    render(<DatasetFacts facts={facts({ encoding: 'utf-8' })} />);

    expect(
      screen.getByRole('heading', { name: 'people.csv' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('12,500 rows × 1 column · Semicolon-separated')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Windows-1252/)).not.toBeInTheDocument();
  });

  it('says when the file was not UTF-8', () => {
    render(<DatasetFacts facts={facts({ encoding: 'windows-1252' })} />);

    expect(
      screen.getByText('Not UTF-8: read as Windows-1252.')
    ).toBeInTheDocument();
  });
});

function facts({
  encoding,
}: {
  encoding: FileFacts['format']['encoding'];
}): FileFacts {
  return {
    fileName: 'people.csv',
    rowCount: 12_500,
    columnCount: 1,
    format: {
      delimiter: ';',
      lineBreak: '\r\n',
      hasByteOrderMark: false,
      encoding,
    },
  };
}
