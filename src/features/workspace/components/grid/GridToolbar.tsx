import { ToggleGroup } from 'radix-ui';
import { tv, twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { CategoryBadge } from '../CategoryBadge';
import {
  reviewActions,
  useIsOnlyIssueRows,
  useReviewView,
} from '../../state/reviewStore';
import { useSelectedIssue } from '../../state/useSelectedIssue';

export type GridToolbarProps = React.ComponentProps<'div'>;

export function GridToolbar({ className = '', ...props }: GridToolbarProps) {
  const view = useReviewView();
  const isOnlyIssueRows = useIsOnlyIssueRows();
  const issue = useSelectedIssue();

  return (
    <div
      className={twMerge(
        'flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2',
        className
      )}
      {...props}
    >
      <ToggleGroup.Root
        type="single"
        value={view}
        aria-label="Which values the grid shows"
        className="inline-flex rounded-md border border-border p-0.5"
        onValueChange={(next) => {
          if (next === 'original' || next === 'cleaned') {
            reviewActions.showView(next);
          }
        }}
      >
        <ToggleGroup.Item value="original" className={viewOption()}>
          Original
        </ToggleGroup.Item>
        <ToggleGroup.Item value="cleaned" className={viewOption()}>
          Cleaned
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      {issue && (
        <div className="flex items-center gap-2">
          <CategoryBadge category={issue.category} />
          {issue.rows.length > 0 && (
            <Button
              aria-pressed={isOnlyIssueRows}
              variant={isOnlyIssueRows ? 'primary' : 'secondary'}
              onClick={() => reviewActions.toggleOnlyIssueRows()}
            >
              Only rows in this issue
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const viewOption = tv({
  base: 'h-6 cursor-pointer rounded-sm px-2.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=on]:bg-primary data-[state=on]:text-on-primary',
});
