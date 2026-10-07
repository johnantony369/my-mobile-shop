import { describe, it, expect } from 'vitest';
import {
  calculatePartnerCommission,
  normalizePhoneNumber,
  parseLeadsCsv,
  formatCurrencyINR,
  CRM_STATUS_LABELS,
} from '../src/utils/partner';
import { shouldPreventSelfReferral } from '../src/firebase/partner';
import { getTrialDaysRemaining } from '../src/utils/activation';

describe('Partner Referral Full Lifecycle Verification', () => {
  it('handles CSV leads import, phone normalization, attribution and settlement math', () => {
    const sampleCsv = `Shop Name,Phone Number,City\nABC Telecom,+91 9988776655,Delhi\nXYZ Mobile,09876543210,Mumbai`;
    const parsed = parseLeadsCsv(sampleCsv);
    expect(parsed.leads).toHaveLength(2);
    expect(parsed.leads[0].phone).toBe('9988776655');
    expect(parsed.leads[1].phone).toBe('9876543210');

    // Prevent self referral
    expect(shouldPreventSelfReferral('partner1', '9988776655', 'partner1', '9988776655')).toBe(true);
    expect(shouldPreventSelfReferral('partner1', '9988776655', 'shop1', '9111122222')).toBe(false);

    // Plan conversions
    const monthlyCommission = calculatePartnerCommission('monthly');
    const yearlyCommission = calculatePartnerCommission('yearly');
    expect(monthlyCommission).toBe(75);
    expect(yearlyCommission).toBe(499);

    // Settlement balance
    const totalEarnings = monthlyCommission + yearlyCommission;
    expect(totalEarnings).toBe(574);
    expect(formatCurrencyINR(totalEarnings)).toBe('₹574');

    // 7-day extended trial
    const customTrial = getTrialDaysRemaining(new Date().toISOString(), 7);
    expect(customTrial).toBe(7);

    // All 6 CRM statuses
    const statuses = Object.keys(CRM_STATUS_LABELS);
    expect(statuses).toEqual([
      'contacted',
      'in_trial',
      'not_interested',
      'plan_purchased',
      'payout_in_progress',
      'paid',
    ]);
  });
});
