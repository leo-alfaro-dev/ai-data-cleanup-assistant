import { formatDate } from '@/engine/values/formatDate';

export function toSignupDate(dayOffset: number): string {
  const date = new Date(FIRST_SIGNUP_DAY + dayOffset * MILLISECONDS_PER_DAY);

  return formatDate({
    date: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    },
    format: 'YYYY-MM-DD',
  });
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const FIRST_SIGNUP_DAY = Date.UTC(2022, 0, 1);

export const SIGNUP_DAY_COUNT = Math.round(
  (Date.UTC(2025, 0, 1) - FIRST_SIGNUP_DAY) / MILLISECONDS_PER_DAY
);
