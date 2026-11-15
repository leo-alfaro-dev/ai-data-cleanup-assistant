import { test as base } from '@playwright/test';
import { mockAiRoutes } from './aiRoutes';

export { expect } from '@playwright/test';

// Every test starts with the AI routes mocked.
export const test = base.extend({
  page: async ({ page }, provide) => {
    await mockAiRoutes(page);
    await provide(page);
  },
});
