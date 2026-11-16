import type { IconType } from 'react-icons';
import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';

export type IconCircleProps = React.ComponentProps<'span'> &
  VariantProps<typeof iconCircle> & {
    icon: IconType;
  };

export function IconCircle({
  icon: Icon,
  tone,
  size,
  className = '',
  ...props
}: IconCircleProps) {
  const slots = iconCircle({ tone, size });

  return (
    <span className={slots.root({ className })} {...props}>
      <Icon aria-hidden className={slots.icon()} />
    </span>
  );
}

const iconCircle = tv({
  slots: {
    root: 'flex shrink-0 items-center justify-center rounded-full',
    icon: '',
  },
  variants: {
    tone: {
      brand: { root: 'bg-tint text-primary' },
      danger: { root: 'bg-danger/10 text-danger' },
    },
    size: {
      sm: { root: 'size-8', icon: 'size-4' },
      md: { root: 'size-9', icon: 'size-4' },
      lg: { root: 'size-11', icon: 'size-5' },
    },
  },
  defaultVariants: { tone: 'brand', size: 'md' },
});
