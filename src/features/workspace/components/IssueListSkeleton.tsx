import { twMerge } from 'tailwind-variants';
import { IssueCardSkeleton } from './IssueCardSkeleton';

export type IssueListSkeletonProps = React.ComponentProps<'div'>;

const SKELETON_CARD_COUNT = 6;

export function IssueListSkeleton({
  className = '',
  ...props
}: IssueListSkeletonProps) {
  return (
    <div
      aria-hidden
      className={twMerge('flex flex-col gap-2 overflow-hidden', className)}
      {...props}
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <IssueCardSkeleton key={index} />
      ))}
    </div>
  );
}
