import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type StatTileProps = React.ComponentProps<'div'> &
  VariantProps<typeof statTile> & {
    label: string;
  };

/** One term of a `dl`: the label reads first, and the value shows above it, large. */
export function StatTile({
  label,
  tone,
  children,
  className = '',
  ...props
}: StatTileProps) {
  const slots = statTile({ tone });

  return (
    <div className={slots.root({ className })} {...props}>
      <dt className={slots.label()}>{label}</dt>
      <dd className={slots.value()}>{children}</dd>
    </div>
  );
}

const statTile = tv({
  slots: {
    root: 'flex min-w-0 flex-col-reverse justify-end gap-1 rounded-xl border px-3 py-2.5',
    label: 'text-xs font-medium',
    value: 'text-lg leading-tight font-semibold tracking-tight tabular-nums',
  },
  variants: {
    tone: {
      solid: {
        root: 'border-primary-strong bg-primary text-on-primary',
        label: 'text-on-primary/85',
      },
      tint: {
        root: 'border-transparent bg-tint',
        label: 'text-primary',
      },
      plain: {
        root: 'border-border bg-surface',
        label: 'text-text-secondary',
      },
    },
  },
  defaultVariants: { tone: 'plain' },
});
