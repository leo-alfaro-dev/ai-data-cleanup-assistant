import { memoizeLast } from '@/lib/memoizeLast';
import { listPlausibleIssueIds } from './listPlausibleIssueIds';

// One memo for the hook and for code that is not a component, so both see the same set.
export const readPlausibleIssueIds = memoizeLast(listPlausibleIssueIds);
