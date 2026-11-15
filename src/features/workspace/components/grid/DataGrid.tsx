import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-variants';
import { useRowChunks } from '../../state/useRowChunks';
import { useFacts } from '../../state/workspaceStore';
import { DataGridBody } from './DataGridBody';
import { toColumnWidths } from './toColumnWidths';

export type DataGridProps = React.ComponentProps<'div'>;

export function DataGrid({ className = '', ...props }: DataGridProps) {
  const { columns, rowCount } = useFacts();
  const firstChunk = useRowChunks((chunks) => chunks[0]);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  );
  const widths = useMemo(
    () => toColumnWidths({ columns, rows: firstChunk ?? [] }),
    [columns, firstChunk]
  );

  return (
    <div
      ref={setScrollElement}
      role="table"
      aria-label="Data"
      aria-rowcount={rowCount + 1}
      aria-colcount={columns.length + 1}
      tabIndex={0}
      className={twMerge(
        'relative min-h-0 flex-1 overflow-auto bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        className
      )}
      {...props}
    >
      {scrollElement && (
        <DataGridBody
          key={widths.join(',')}
          scrollElement={scrollElement}
          widths={widths}
        />
      )}
    </div>
  );
}
