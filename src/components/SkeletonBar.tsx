import { twMerge } from 'tailwind-variants';

export type SkeletonBarProps = React.ComponentProps<'div'>;

export function SkeletonBar({ className = '', ...props }: SkeletonBarProps) {
  return (
    <div
      className={twMerge(
        'animate-pulse rounded-md bg-muted motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  );
}
