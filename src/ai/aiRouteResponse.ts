import { z } from 'zod';
import { AI_FAILURE_REASONS } from './aiFailureReason';
import { aiCallRecord } from './aiCallRecord';
import { hostedQuota } from './hostedQuota';

// The envelope every route answers with. A task's own contract reads `result` afterwards.
export const aiRouteResponse = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    result: z.unknown(),
    calls: z.array(aiCallRecord),
    quota: hostedQuota.nullish(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(AI_FAILURE_REASONS),
    calls: z.array(aiCallRecord),
    quota: hostedQuota.nullish(),
  }),
]);
