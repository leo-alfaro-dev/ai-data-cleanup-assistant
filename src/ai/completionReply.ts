import { z } from 'zod';

const usage = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  cost: z.number().nullish(),
});

// The parts of a chat completion this app reads. The SDK does not type `cost`, and OpenRouter can
// answer 200 with an error in the body, so the whole reply is validated here.
export const completionReply = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullish() }) }))
    .min(1),
  usage: usage.nullish(),
});
