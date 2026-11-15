import { z } from 'zod';

// OpenRouter can answer 200 with this in the body.
export const completionError = z.object({
  error: z.object({ code: z.number().nullish() }),
});
