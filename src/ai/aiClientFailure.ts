// What went wrong with one call, without any class of the SDK that made it.
export type AiClientFailure =
  | { kind: 'http'; status: number; payload: unknown }
  | { kind: 'timeout' }
  | { kind: 'aborted' }
  | { kind: 'network' };
