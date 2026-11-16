import { z } from 'zod';
import type { ModelPrices } from './modelPrices';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';

// Other models on the list carry negative placeholder prices, so only the asked ones are checked.
const modelList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.object({ prompt: z.string(), completion: z.string() }),
    })
  ),
});

const price = z.coerce.number().nonnegative();

/** OpenRouter's public list needs no key and carries no data of ours. Prices come in the order asked. */
export async function fetchModelPrices(
  ids: readonly string[]
): Promise<{ id: string; prices: ModelPrices }[]> {
  const response = await fetch(MODELS_URL);
  if (!response.ok) {
    throw new Error(`OpenRouter's model list answered ${response.status}.`);
  }

  const { data } = modelList.parse(await response.json());

  return ids.map((id) => {
    const model = data.find((entry) => entry.id === id);
    if (!model) throw new Error(`${id} is not on OpenRouter's model list.`);

    return {
      id,
      prices: {
        promptPerToken: price.parse(model.pricing.prompt),
        completionPerToken: price.parse(model.pricing.completion),
      },
    };
  });
}
