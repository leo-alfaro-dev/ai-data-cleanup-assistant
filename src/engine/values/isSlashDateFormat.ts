import type { DateFormat } from './dateFormat';

export function isSlashDateFormat(format: DateFormat): boolean {
  return format === 'MM/DD/YYYY' || format === 'DD/MM/YYYY';
}
