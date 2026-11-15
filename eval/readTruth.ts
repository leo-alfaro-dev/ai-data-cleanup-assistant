import { readFileSync } from 'node:fs';
import { prettifyError } from 'zod';
import { tryCatch } from '@/lib/tryCatch';
import type { Truth } from './corrupt/truth';
import { truthSchema } from './corrupt/truth';

export function readTruth(path: string): Truth {
  const { result: text, error } = tryCatch(() => readFileSync(path, 'utf8'));
  if (error) throw new Error(`Cannot read ${path}. Run yarn eval:data first.`);

  const { result: json, error: syntaxError } = tryCatch((): unknown =>
    JSON.parse(text)
  );
  if (syntaxError) throw new Error(`${path} is not valid JSON.`);

  const parsed = truthSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `${path} is not a valid truth file:\n${prettifyError(parsed.error)}`
    );
  }

  return parsed.data;
}
