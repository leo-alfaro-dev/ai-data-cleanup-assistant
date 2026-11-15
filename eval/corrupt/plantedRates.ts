import type { PlantedKind } from './plantedKind';
import type { PlantedError } from './truth';

// Shares of the clean rows.
export const PLANTED_RATES = {
  duplicate: {
    exactCopy: 0.07,
    nameTypo: 0.03,
    casing: 0.02,
    phoneFormat: 0.02,
    blankedField: 0.01,
  },
  inconsistent: {
    stateVariant: 0.04,
    casing: 0.03,
    spacing: 0.03,
    dateFormat: 0.03,
  },
  missing: {
    blank: 0.03,
    placeholder: 0.025,
  },
  suspicious: {
    spendTimes100: 0.01,
    negativeSpend: 0.005,
    emailWithoutAt: 0.005,
    emailDomainTypo: 0.01,
    formulaLike: 0.001,
  },
} satisfies {
  [Category in PlantedError['category']]: Record<PlantedKind<Category>, number>;
};

// Share of the clean rows copied a second time.
export const REPEATED_ORIGINAL_RATE = 0.003;

// Share of the spacing errors inside a value ("San  Diego") instead of around it.
export const INNER_SPACING_SHARE = 0.2;
