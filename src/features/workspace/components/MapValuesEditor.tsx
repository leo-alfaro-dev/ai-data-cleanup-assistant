import { useState } from 'react';
import { twMerge } from 'tailwind-variants';
import { TextInput } from '@/components/TextInput';
import { VisibleValue } from '@/components/VisibleValue';
import type { MapValues } from '@/engine/changes/change';

export type MapValuesEditorProps = Omit<
  React.ComponentProps<'ul'>,
  'onChange'
> & {
  original: MapValues;
  initial: MapValues;
  onChange: (change: MapValues) => void;
};

export function MapValuesEditor({
  original,
  initial,
  onChange,
  className = '',
  ...props
}: MapValuesEditorProps) {
  const [canonicals, setCanonicals] = useState(() =>
    original.groups.map(
      ({ canonical, variants }) =>
        initial.groups.find((group) =>
          group.variants.some((variant) => variants.includes(variant))
        )?.canonical ?? canonical
    )
  );
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        original.groups
          .flatMap(({ variants }) => variants)
          .filter(
            (variant) =>
              !initial.groups.some(({ variants }) => variants.includes(variant))
          )
      )
  );

  const emit = ({
    nextCanonicals,
    nextExcluded,
  }: {
    nextCanonicals: readonly string[];
    nextExcluded: ReadonlySet<string>;
  }) => {
    setCanonicals([...nextCanonicals]);
    setExcluded(nextExcluded);
    onChange({
      ...original,
      groups: original.groups
        .map(({ variants }, index) => ({
          canonical: nextCanonicals[index] ?? '',
          variants: variants.filter((variant) => !nextExcluded.has(variant)),
        }))
        .filter(({ variants }) => variants.length > 0),
    });
  };

  return (
    <ul
      aria-label="Values to change"
      className={twMerge(
        'flex max-h-72 flex-col gap-3 overflow-y-auto',
        className
      )}
      {...props}
    >
      {original.groups.map(({ variants }, index) => (
        <li
          key={variants.join('\u0000')}
          className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-2.5"
        >
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Common spelling for {variants.join(', ')}
            <TextInput
              value={canonicals[index] ?? ''}
              spellCheck={false}
              onChange={(event) =>
                emit({
                  nextCanonicals: canonicals.map((canonical, position) =>
                    position === index ? event.target.value : canonical
                  ),
                  nextExcluded: excluded,
                })
              }
            />
          </label>
          <ul
            aria-label={`Variants of ${variants.join(', ')}`}
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {variants.map((variant) => (
              <li key={variant}>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    className="size-3.5 cursor-pointer accent-primary"
                    checked={!excluded.has(variant)}
                    onChange={(event) => {
                      const next = new Set(excluded);
                      if (event.target.checked) next.delete(variant);
                      else next.add(variant);
                      emit({ nextCanonicals: canonicals, nextExcluded: next });
                    }}
                  />
                  <VisibleValue value={variant} className="font-mono" />
                </label>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
