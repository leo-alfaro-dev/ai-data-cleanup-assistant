import type { IconBaseProps, IconType } from 'react-icons';
import { twMerge } from 'tailwind-variants';

export type BackdropIconProps = IconBaseProps & {
  icon: IconType;
};

/** A large, faded icon behind a card's content. The card is `relative overflow-hidden`. */
export function BackdropIcon({
  icon: Icon,
  className = '',
  ...props
}: BackdropIconProps) {
  return (
    <Icon
      aria-hidden
      className={twMerge(
        'pointer-events-none absolute -right-5 -bottom-6 size-32 text-primary/10',
        className
      )}
      {...props}
    />
  );
}
