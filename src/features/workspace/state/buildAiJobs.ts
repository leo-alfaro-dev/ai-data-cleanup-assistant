import type { AiRequests } from '@/ai/aiRequests';
import type { AiJob } from './aiJob';

export function buildAiJobs(requests: AiRequests): AiJob[] {
  return [
    ...requests.normalizeValues.map((request, index): AiJob => ({
      key: `normalizeValues:${index}`,
      request: { task: 'normalizeValues', request },
      state: { status: 'queued' },
    })),
    ...requests.confirmDuplicates.map((request, index): AiJob => ({
      key: `confirmDuplicates:${index}`,
      request: { task: 'confirmDuplicates', request },
      state: { status: 'queued' },
    })),
    ...requests.assessSuspiciousRows.map((request, index): AiJob => ({
      key: `assessSuspiciousRows:${index}`,
      request: { task: 'assessSuspiciousRows', request },
      state: { status: 'queued' },
    })),
  ];
}
