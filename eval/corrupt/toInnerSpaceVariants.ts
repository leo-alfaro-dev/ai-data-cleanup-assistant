import { NO_BREAK_SPACE } from './noBreakSpace';

export function toInnerSpaceVariants(value: string): string[] {
  return [value.replace(' ', '  '), value.replace(' ', NO_BREAK_SPACE)];
}
