import { twMerge } from 'tailwind-variants';
import { SkeletonBar } from '@/components/SkeletonBar';

export type IssueExamplesSkeletonProps = React.ComponentProps<'div'>;

export function IssueExamplesSkeleton({
  className = '',
  ...props
}: IssueExamplesSkeletonProps) {
  return (
    <div
      aria-hidden
      className={twMerge('flex flex-col gap-2', className)}
      {...props}
    >
      <SkeletonBar className="h-4 w-48" />
      <SkeletonBar className="h-5 w-64" />
      <SkeletonBar className="h-5 w-56" />
    </div>
  );
}
