export type ReplyUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
};

export type ParsedReply<Output> =
  | { kind: 'valid'; value: Output; usage: ReplyUsage }
  | { kind: 'invalid'; content: string; problem: string; usage: ReplyUsage }
  | { kind: 'error'; status: number };
