import { NO_BREAK_SPACE } from './noBreakSpace';

export function toPaddedVariants(value: string): string[] {
  return [
    ` ${value}`,
    `${value} `,
    ` ${value} `,
    `${value}${NO_BREAK_SPACE}`,
    `${NO_BREAK_SPACE}${value}`,
  ];
}
