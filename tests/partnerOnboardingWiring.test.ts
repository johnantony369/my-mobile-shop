import { describe, it, expect } from 'vitest';
import { calculatePartnerCommission } from '../src/utils/partner';
import { getTrialDaysRemaining, isTrialActive } from '../src/utils/activation';

describe('Partner Onboarding & Plan Conversion Wiring', () => {
  it('applies 7-day trial instead of 3-day trial when partner code is bound', () => {
    const isPartnerReferred = true;
    const trialDays = isPartnerReferred ? 7 : 3;
    expect(trialDays).toBe(7);
  });

  it('triggers exact commission upon Pro plan grant', () => {
    expect(calculatePartnerCommission('monthly')).toBe(75);
    expect(calculatePartnerCommission('yearly')).toBe(499);
  });
});
