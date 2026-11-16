import { tv } from 'tailwind-variants';

/** The small uppercase label above a section. */
export const eyebrow = tv({
  base: 'text-xs font-semibold tracking-widest uppercase',
  variants: {
    tone: {
      brand: 'text-primary',
      inverse: 'text-on-primary/85',
    },
  },
  defaultVariants: { tone: 'brand' },
});
