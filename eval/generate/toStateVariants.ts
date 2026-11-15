import { LOCATIONS } from './locations';

export function toStateVariants(state: string): string[] {
  const location = LOCATIONS.find((candidate) => candidate.state === state);

  return location ? [location.stateName, location.stateAbbreviation] : [];
}
