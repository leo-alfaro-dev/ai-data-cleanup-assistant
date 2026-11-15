import { describe, expect, it } from 'vitest';
import { runChecks } from '@/engine/checks/runChecks';
import { profileDataset } from '@/engine/profile/profileDataset';
import { expectIssueContract } from '@/engine/testing/expectIssueContract';
import { readDataset } from './readDataset';

describe('the checks on the committed eval dataset', () => {
  const dataset = readDataset('eval/datasets/customers.csv');

  it('give issues that keep to their contract', () => {
    const issues = runChecks({ dataset, profile: profileDataset(dataset) });

    expect(issues.length).toBeGreaterThan(0);
    expectIssueContract({ dataset, issues });
  });
});
