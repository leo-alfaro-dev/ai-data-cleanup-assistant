import { twMerge } from 'tailwind-variants';

export type VisibleValueProps = React.ComponentProps<'span'> & {
  value: string;
};

export function VisibleValue({
  value,
  className = '',
  ...props
}: VisibleValueProps) {
  if (value === '') {
    return (
      <span
        className={twMerge('text-text-secondary italic', className)}
        {...props}
      >
        empty
      </span>
    );
  }

  return (
    <span className={twMerge('whitespace-pre', className)} {...props}>
      {toSegments(value).map((segment, index) =>
        segment.kind === 'mark' ? (
          <span
            key={index}
            role="img"
            aria-label={segment.label}
            className="rounded-sm bg-muted text-text-secondary"
          >
            {segment.glyph}
          </span>
        ) : (
          segment.text
        )
      )}
    </span>
  );
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'mark'; glyph: string; label: string };

const INVISIBLE_CHARACTERS: Record<string, { glyph: string; label: string }> = {
  ' ': { glyph: '·', label: 'space' },
  '\t': { glyph: '→', label: 'tab' },
  '\u00a0': { glyph: '°', label: 'non-breaking space' },
  '\n': { glyph: '↵', label: 'line break' },
  '\r': { glyph: '↵', label: 'line break' },
  '\u2028': { glyph: '↵', label: 'line break' },
  '\u2029': { glyph: '↵', label: 'line break' },
};

const OTHER_SPACE = { glyph: '·', label: 'other space' };

const WHITESPACE = /\s/;

// Spaces show at the edges only; any other whitespace shows wherever it sits.
function toSegments(value: string): Segment[] {
  const leadingEnd = value.length - value.trimStart().length;
  const trailingStart = value.trimEnd().length;
  const segments: Segment[] = [];

  for (const [index, character] of value.split('').entries()) {
    const isEdge = index < leadingEnd || index >= trailingStart;
    const invisible =
      INVISIBLE_CHARACTERS[character] ??
      (WHITESPACE.test(character) ? OTHER_SPACE : undefined);
    const isMarked = invisible && (character !== ' ' || isEdge);

    if (isMarked) {
      segments.push({ kind: 'mark', ...invisible });
      continue;
    }

    const last = segments.at(-1);
    if (last?.kind === 'text') last.text += character;
    else segments.push({ kind: 'text', text: character });
  }

  return segments;
}
