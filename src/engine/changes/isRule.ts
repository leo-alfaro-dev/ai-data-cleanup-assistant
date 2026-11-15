import type { Change, Rule } from './change';

export function isRule(change: Change): change is Rule {
  switch (change.kind) {
    case 'trimWhitespace':
    case 'mapValues':
    case 'standardizeDates':
    case 'dropDuplicateRows':
      return true;
    case 'setCells':
    case 'mergeRows':
    case 'removeRows':
      return false;
  }
}
