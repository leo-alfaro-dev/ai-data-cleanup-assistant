import { isBlank } from '@/engine/values/isBlank';
import { isPlaceholder } from '@/engine/values/isPlaceholder';
import { readFormulaTrigger } from '@/engine/values/readFormulaTrigger';
import { shortenValue } from '@/lib/shortenValue';
import { MAX_REASON_LENGTH } from '../../textLimits';
import type {
  NormalizeValuesReply,
  NormalizeValuesRequest,
  NormalizeValuesResult,
} from './normalizeValuesContract';
import { MAX_VALUE_LENGTH } from './normalizeValuesContract';

type Group = NormalizeValuesResult['groups'][number];

/**
 * Keeps only what the reply says about values that were sent. A claim is a group, a value cited in a
 * group, or a placeholder. A value joins one group at most, a group needs two spellings, and a
 * canonical spelling must fit a cell and cannot start a formula. Every claim that is left out is
 * counted, except a placeholder a check already finds, which is only redundant.
 */
export function validateNormalizeValues({
  request,
  reply,
}: {
  request: NormalizeValuesRequest;
  reply: NormalizeValuesReply;
}): NormalizeValuesResult {
  const sent = new Set(request.values.map(({ value }) => value));
  const used = new Set<string>();
  const groups: Group[] = [];
  let claimCount = 0;
  let droppedClaims = 0;

  for (const group of reply.groups) {
    claimCount += 1 + group.variants.length;
    const cited: string[] = [];

    for (const variant of group.variants) {
      const isUsable =
        sent.has(variant) && !used.has(variant) && !cited.includes(variant);
      if (isUsable) cited.push(variant);
      else droppedClaims += 1;
    }

    const isCanonicalInFile = sent.has(group.canonical);
    const spellings = new Set(cited);
    if (isCanonicalInFile) spellings.add(group.canonical);
    const isValid =
      !isBlank(group.canonical) &&
      group.canonical.length <= MAX_VALUE_LENGTH &&
      readFormulaTrigger(group.canonical) === null &&
      !(isCanonicalInFile && used.has(group.canonical)) &&
      spellings.size >= 2;
    if (!isValid) {
      droppedClaims += 1 + cited.length;
      continue;
    }

    for (const spelling of spellings) used.add(spelling);
    groups.push({
      canonical: group.canonical,
      isCanonicalInFile,
      variants: cited.filter((variant) => variant !== group.canonical),
      reason: shortenValue({
        value: group.reason,
        maxLength: MAX_REASON_LENGTH,
      }),
      confidence: group.confidence,
    });
  }

  const placeholders: NormalizeValuesResult['placeholders'] = [];
  for (const placeholder of reply.placeholders) {
    if (isPlaceholder(placeholder.value)) continue;

    claimCount += 1;
    const isUsable =
      sent.has(placeholder.value) && !used.has(placeholder.value);
    if (!isUsable) {
      droppedClaims += 1;
      continue;
    }

    used.add(placeholder.value);
    placeholders.push({
      ...placeholder,
      reason: shortenValue({
        value: placeholder.reason,
        maxLength: MAX_REASON_LENGTH,
      }),
    });
  }

  return {
    column: request.column,
    groups,
    placeholders,
    claimCount,
    droppedClaims,
  };
}
