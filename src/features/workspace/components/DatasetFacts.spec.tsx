import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { workspaceStore$ } from '../state/workspaceStore';
import { DatasetFacts } from './DatasetFacts';

describe('DatasetFacts', () => {
  beforeEach(() => {
    workspaceStore$.setState({ phase: { status: 'empty' } });
  });

  it('shows the file name, its size and its delimiter', () => {
    showFacts({ encoding: 'utf-8' });

    render(<DatasetFacts />);

    expect(
      screen.getByRole('heading', { name: 'people.csv' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('12,500 rows × 1 column · Semicolon-separated')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Windows-1252/)).not.toBeInTheDocument();
  });

  it('says when the file was not UTF-8', () => {
    showFacts({ encoding: 'windows-1252' });

    render(<DatasetFacts />);

    expect(
      screen.getByText(/Not UTF-8: read as Windows-1252\./)
    ).toBeInTheDocument();
  });
});

function showFacts({
  encoding,
}: {
  encoding: FileFacts['format']['encoding'];
}): void {
  workspaceStore$.setState({
    phase: {
      status: 'ready',
      rowChunks: [],
      facts: {
        fileName: 'people.csv',
        rowCount: 12_500,
        columns: [{ key: toColumnKey(0), header: 'name' }],
        format: {
          delimiter: ';',
          lineBreak: '\r\n',
          hasByteOrderMark: false,
          encoding,
        },
      },
    },
  });
}
