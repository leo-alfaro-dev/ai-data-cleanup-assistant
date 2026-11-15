import type { Customer } from './customer';
import { FIRST_CUSTOMER_NUMBER, toCustomerId } from './customerId';
import { EMAIL_DOMAINS } from './emailDomains';
import { FIRST_NAMES } from './firstNames';
import { generateMonthlySpend } from './generateMonthlySpend';
import { getAt } from './getAt';
import { LAST_NAMES } from './lastNames';
import { COUNTRY, LOCATIONS } from './locations';
import { PHONE_NUMBERS } from './phoneNumbers';
import { PLANS } from './plans';
import type { Random } from './random';
import { SIGNUP_DAY_COUNT, toSignupDate } from './toSignupDate';

export function generateCustomers({
  random,
  count,
}: {
  random: Random;
  count: number;
}): Customer[] {
  const fullNames = random.sample({ items: listFullNames(), count });
  const phones = random.sample({ items: PHONE_NUMBERS, count });
  const signupDays = Array.from({ length: count }, () =>
    random.integer({ min: 0, max: SIGNUP_DAY_COUNT - 1 })
  ).sort((first, second) => first - second);

  return fullNames.map(({ firstName, lastName }, index) => {
    const location = random.pick(LOCATIONS);
    const plan = random.pickWeighted({
      items: PLANS,
      weightOf: (candidate) => candidate.share,
    });
    const domain = random.pick(EMAIL_DOMAINS);

    return {
      customer_id: toCustomerId(FIRST_CUSTOMER_NUMBER + index),
      first_name: firstName,
      last_name: lastName,
      email: `${firstName}.${lastName}@${domain}`.toLowerCase(),
      phone: getAt({ items: phones, index }),
      city: location.city,
      state: location.state,
      country: COUNTRY,
      signup_date: toSignupDate(getAt({ items: signupDays, index })),
      plan: plan.name,
      monthly_spend: generateMonthlySpend({ plan, random }),
    };
  });
}

function listFullNames(): { firstName: string; lastName: string }[] {
  return FIRST_NAMES.flatMap((firstName) =>
    LAST_NAMES.map((lastName) => ({ firstName, lastName }))
  );
}
