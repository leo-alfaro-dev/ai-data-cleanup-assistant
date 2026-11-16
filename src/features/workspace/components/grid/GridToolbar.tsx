import { ToggleGroup } from 'radix-ui';
import { tv, twMerge } from 'tailwind-variants';
import { Button } from '@/components/Button';
import { ariaKeysOf } from '../../shortcuts';
import { CategoryBadge } from '../CategoryBadge';
import { ShortcutHint } from '../ShortcutHint';
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
        'flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 sm:px-4',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <ToggleGroup.Root
          type="single"
          value={view}
          aria-label="Which values the grid shows"
          aria-keyshortcuts={ariaKeysOf('toggleView')}
          className="inline-flex rounded-full border border-border bg-canvas p-0.5"
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
        <ShortcutHint action="toggleView" />
      </div>
      {issue && (
        <div className="flex min-w-0 items-center gap-3">
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
  base: 'h-7 cursor-pointer rounded-full px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=on]:bg-primary data-[state=on]:text-on-primary data-[state=on]:shadow-xs',
});
