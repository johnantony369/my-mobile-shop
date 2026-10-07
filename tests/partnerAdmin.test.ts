import { describe, it, expect } from 'vitest';
import { calculatePartnerCommission } from '../src/utils/partner';

describe('Admin Settlement Calculations', () => {
  it('correctly aggregates pending balance for multiple conversions', () => {
    const conversions: Array<'monthly' | 'yearly'> = ['monthly', 'yearly', 'monthly'];
    const total = conversions.reduce((sum, p) => sum + calculatePartnerCommission(p), 0);
    expect(total).toBe(75 + 499 + 75); // 649
  });

  it('calculates zero commission for null or invalid plans', () => {
    expect(calculatePartnerCommission(null)).toBe(0);
    expect(calculatePartnerCommission(undefined)).toBe(0);
  });
});
