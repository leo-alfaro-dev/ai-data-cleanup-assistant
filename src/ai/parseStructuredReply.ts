import type { z } from 'zod';
import { tryCatch } from '@/lib/tryCatch';
import { completionError } from './completionError';
import { completionReply } from './completionReply';
import type { ParsedReply, ReplyUsage } from './parsedReply';

const NO_USAGE: ReplyUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  cost: null,
};

const MAX_LISTED_PROBLEMS = 5;

/** One reply from the provider to a value that matches the schema, or the reason it does not. */
export function parseStructuredReply<Output>({
  reply,
  schema,
}: {
  reply: unknown;
  schema: z.ZodType<Output>;
}): ParsedReply<Output> {
  const failed = completionError.safeParse(reply);
  if (failed.success) {
    return { kind: 'error', status: failed.data.error.code ?? 502 };
  }

  const envelope = completionReply.safeParse(reply);
  if (!envelope.success) {
    return invalid({ content: '', problem: 'The reply had no message.' });
  }

  const { usage } = envelope.data;
  const replyUsage: ReplyUsage = usage
    ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: usage.cost ?? null,
      }
    : NO_USAGE;
  const content = envelope.data.choices[0]?.message.content ?? '';

  const { result: json, error } = tryCatch(() => JSON.parse(content));
  if (error) {
    return invalid({
      content,
      problem: 'The reply was not valid JSON.',
      usage: replyUsage,
    });
  }

  const checked = schema.safeParse(json);
  if (!checked.success) {
    return invalid({
      content,
      problem: listProblems(checked.error),
      usage: replyUsage,
    });
  }

  return { kind: 'valid', value: checked.data, usage: replyUsage };
}

function invalid({
  content,
  problem,
  usage = NO_USAGE,
}: {
  content: string;
  problem: string;
  usage?: ReplyUsage;
}): ParsedReply<never> {
  return { kind: 'invalid', content, problem, usage };
}

function listProblems(error: z.ZodError): string {
  return error.issues
    .slice(0, MAX_LISTED_PROBLEMS)
    .map(({ path, message }) => `${path.join('.') || 'reply'}: ${message}`)
    .join('; ');
}
