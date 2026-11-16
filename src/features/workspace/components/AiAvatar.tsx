import { twMerge } from 'tailwind-variants';

export type AiAvatarProps = React.ComponentProps<'span'>;

/** Marks what the AI said, as initials in a tinted circle. Decorative: the text beside it says it. */
export function AiAvatar({ className = '', ...props }: AiAvatarProps) {
  return (
    <span
      aria-hidden
      className={twMerge(
        'flex size-5 shrink-0 items-center justify-center rounded-full bg-tint text-xs leading-none font-semibold tracking-tight text-primary',
        className
      )}
      {...props}
    >
      AI
    </span>
  );
}
