export const SAMPLE_ROW_COUNT = 1150;

export const SAMPLES = {
  customers: { url: '/samples/customers.csv', fileName: 'customers.csv' },
  nextMonth: {
    url: '/samples/customers-next-month.csv',
    fileName: 'customers-next-month.csv',
  },
} as const;

export type SampleName = keyof typeof SAMPLES;

export const SAMPLE_RECIPE = {
  url: '/samples/customers.recipe.json',
  fileName: 'customers.recipe.json',
} as const;
