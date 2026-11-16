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
        'flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-2 shadow-xs',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1.5 p-1">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-3 w-20" />
        </div>
        <SkeletonBar className="h-4 w-3/4" />
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-5/6" />
        <SkeletonBar className="h-3 w-12" />
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <SkeletonBar className="h-8 w-22 rounded-full" />
        <SkeletonBar className="h-8 w-22 rounded-full" />
      </div>
    </div>
  );
}
