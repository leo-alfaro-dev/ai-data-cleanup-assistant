import type { IssueId } from '@/engine/issues/issue';

/** Puts keyboard focus on the main button of an issue's card, once the card is on screen. */
export function focusIssueCard(issueId: IssueId): void {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(
        `[data-issue-id="${CSS.escape(issueId)}"] button`
      )
      ?.focus({ preventScroll: true });
  });
}
