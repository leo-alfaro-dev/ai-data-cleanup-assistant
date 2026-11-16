import { useId } from 'react';
import type { IconType } from 'react-icons';
import type { VariantProps } from 'tailwind-variants';
import { tv } from 'tailwind-variants';
import { BackdropIcon } from '@/components/BackdropIcon';
import { eyebrow } from '@/components/eyebrow';

export type StartCardProps = React.ComponentProps<'div'> &
  VariantProps<typeof startCard> & {
    icon: IconType;
    label: string;
    title: string;
  };

export function StartCard({
  tone,
  icon,
  label,
  title,
  children,
  className = '',
  ...props
}: StartCardProps) {
  const titleId = useId();
  const slots = startCard({ tone });

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={slots.root({ className })}
      {...props}
    >
      <BackdropIcon icon={icon} className={slots.icon()} />
      <div className="relative flex flex-col gap-2">
        <p
          className={eyebrow({ tone: tone === 'solid' ? 'inverse' : 'brand' })}
        >
          {label}
        </p>
        <h3 id={titleId} className={slots.title()}>
          {title}
        </h3>
      </div>
      <div className="relative flex flex-1 flex-col items-start gap-4 text-sm">
        {children}
      </div>
    </div>
  );
}

const startCard = tv({
  slots: {
    root: 'relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-6',
    title: 'text-xl font-semibold tracking-tight',
    icon: '-right-6 -bottom-8 size-40',
  },
  variants: {
    tone: {
      solid: {
        root: 'border-primary-strong bg-primary text-on-primary/85 shadow-lg shadow-primary/20',
        title: 'text-on-primary',
        icon: 'text-on-primary/10',
      },
      tint: {
        root: 'border-transparent bg-tint text-text-secondary',
        title: 'text-text-primary',
        icon: 'text-primary/10',
      },
    },
  },
  defaultVariants: { tone: 'tint' },
});
