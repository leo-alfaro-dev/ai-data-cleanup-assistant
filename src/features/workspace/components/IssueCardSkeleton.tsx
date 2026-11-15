import { twMerge } from 'tailwind-variants';
import { SkeletonBar } from '@/components/SkeletonBar';

export type IssueCardSkeletonProps = React.ComponentProps<'div'>;

export function IssueCardSkeleton({
  className = '',
  ...props
}: IssueCardSkeletonProps) {
  return (
    <div
      aria-hidden
      className={twMerge(
        'flex flex-col gap-1 rounded-lg border border-border bg-surface p-2',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 p-1">
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-5 w-28" />
          <SkeletonBar className="h-3 w-16" />
        </div>
        <SkeletonBar className="h-4 w-3/4" />
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-5/6" />
        <SkeletonBar className="h-3 w-12" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <SkeletonBar className="h-8 w-[4.5rem]" />
        <SkeletonBar className="h-8 w-[4.5rem]" />
      </div>
    </div>
  );
}
