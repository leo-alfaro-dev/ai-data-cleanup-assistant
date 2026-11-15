import type { CalendarDate } from './calendarDate';
import type { DateFormat } from './dateFormat';

export type ParsedDate =
  | {
      isAmbiguous: false;
      formats: readonly [DateFormat] | readonly ['MM/DD/YYYY', 'DD/MM/YYYY'];
      date: CalendarDate;
    }
  | {
      isAmbiguous: true;
      formats: readonly ['MM/DD/YYYY', 'DD/MM/YYYY'];
      monthFirst: CalendarDate;
      dayFirst: CalendarDate;
    };
